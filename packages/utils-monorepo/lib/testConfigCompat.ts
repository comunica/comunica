// eslint-disable-next-line import/no-nodejs-modules
import { exec as exec0 } from 'node:child_process';

// eslint-disable-next-line import/no-nodejs-modules
import * as Path from 'node:path';

// eslint-disable-next-line import/no-nodejs-modules
import * as util from 'node:util';
import { readdir, pathExists, readFile, emptyDir, copy } from 'fs-extra';
import semver from 'semver';

const exec = util.promisify(exec0);

/**
 * This will validate if all current engine configs are backwards-compatible.
 * Concretely, this will iterate over all engines in the current monorepo,
 * and it will determine the current and previous versions of their config files.
 * For each of these config files, relevant previous versions of this engine package will be determined.
 * Then, each of those previous engine versions will be installed locally from npm in a temporary directory,
 * and the config package from the current monorepo will be injected into it.
 * The whole config package must be injected, and not just the entry config file,
 * because Components.js resolves the imports within a config file against the installed config package.
 * Then, the QueryEngineFactory will be used to validate if this config is still valid in that engine,
 * which only holds if every actor in the config is a dependency of that engine version.
 * This script will throw an error as soon as one of the configs is not backwards-compatible.
 *
 * See engines/config-query-sparql/README.md for more details on config versioning.
 *
 * @param monorepoDir A monorepo directory.
 */
export async function testConfigCompat(monorepoDir: string): Promise<void> {
  const folders = await readdir(`${monorepoDir}/engines`, { withFileTypes: true });

  // Get available configs, and the monorepo directory of each config package
  const availableConfigs: EngineConfig[] = [];
  const configPackageDirs: Record<string, string> = {};
  for (const folder of folders) {
    if (folder.isDirectory()) {
      const enginePath = Path.join(folder.parentPath, folder.name);
      const packageJson = JSON.parse(await readFile(Path.join(enginePath, 'package.json'), 'utf8'));
      if (!packageJson.files.includes('engine-default.js')) {
        // This is a config package
        configPackageDirs[packageJson.name] = enginePath;
        const configPaths = await readdir(`${enginePath}/config`, { withFileTypes: true });
        for (const configPath of configPaths) {
          if (configPath.isFile() && configPath.name.startsWith('config-')) {
            const version = getSemVerFromConfigName(configPath.name);
            if (version) {
              availableConfigs.push({
                path: Path.join(configPath.parentPath, configPath.name),
                relativePath: Path.join('config', configPath.name),
                packageName: packageJson.name,
                version,
              });
            }
          }
        }
      }
    }
  }

  // Test all engines
  for (const folder of folders) {
    if (folder.isDirectory()) {
      const enginePath = Path.join(folder.parentPath, folder.name);
      const packageJson = JSON.parse(await readFile(Path.join(enginePath, 'package.json'), 'utf8'));
      if (packageJson.files.includes('engine-default.js')) {
        // This is an engine package
        const configPath = Path.join(enginePath, 'config/config-default.json');
        if (await pathExists(configPath)) {
          const json = JSON.parse(await readFile(configPath, 'utf8'));
          if (json.import) {
            const version = getSemVerFromConfigName(json.import[0]);
            if (version && version.semver) {
              await testPreviousVersionsOfEngine(
                availableConfigs,
                configPackageDirs,
                packageJson.name,
                version,
              );
            }
          }
        }
      }
    }
  }
}

async function testPreviousVersionsOfEngine(
  availableConfigs: EngineConfig[],
  configPackageDirs: Record<string, string>,
  engineName: string,
  currentConfigVersion: ConfigSemVer,
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`Testing engine ${engineName}`);

  // List all available configs for this engine
  const applicableConfigs = availableConfigs
    .filter(config => config.version.type === currentConfigVersion.type);

  // Determine list of versions to test
  const configTestRanges = getConfigTestRanges(applicableConfigs, currentConfigVersion.semver!);

  // Install each version from npm, and bintest dynamic engine with config override
  for (const configTestRange of configTestRanges) {
    // eslint-disable-next-line no-console
    console.log(`  Testing '${configTestRange.config.path}' from ${semVerToString(configTestRange.minExclusive)} (excl) to ${configTestRange.maxInclusive ? semVerToString(configTestRange.maxInclusive) : 'latest in major range'} (incl)`);

    const versions = <string[]> JSON.parse((await exec(`npm view ${engineName} versions --json`, { encoding: 'utf8' })).stdout);
    const firstVersion = semver.minSatisfying(versions, `>${semVerToString(configTestRange.minExclusive)}`);
    if (firstVersion) {
      await testEngine(engineName, firstVersion, configTestRange.config, configPackageDirs);
    } else {
      // eslint-disable-next-line no-console
      console.log(`    Could not find a version higher than ${semVerToString(configTestRange.minExclusive)} for engine ${engineName} on npm`);
    }

    let secondVersion: string | null;
    if (configTestRange.maxInclusive) {
      secondVersion = semVerToString(configTestRange.maxInclusive);
    } else {
      secondVersion = semver.maxSatisfying(versions, `>${semVerToString(currentConfigVersion.semver!)}`);
    }
    if (secondVersion) {
      await testEngine(engineName, secondVersion, configTestRange.config, configPackageDirs);
    }
  }
}

async function testEngine(
  engineName: string,
  version: string,
  config: EngineConfig,
  configPackageDirs: Record<string, string>,
): Promise<void> {
  // Install package
  // eslint-disable-next-line no-console
  console.log(`    Installing '${engineName}' at version ${version}`);
  const installPath = '/tmp/comunica-test-previous-engines/';
  await emptyDir(installPath);
  await exec(`npm install ${engineName}@${version}`, { cwd: installPath, encoding: 'utf8' });

  const installedConfigPaths = await findInstalledPackages(installPath, config.packageName);
  if (installedConfigPaths.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`      Skipping, as '${engineName}' at version ${version} does not depend on '${config.packageName}'`);
    return;
  }

  // Skip configs that this engine version could not have been using yet,
  // as those are only meant for the upcoming release.
  if (!await pathExists(Path.join(installedConfigPaths[0], config.relativePath))) {
    // eslint-disable-next-line no-console
    console.log(`      Skipping, as '${config.relativePath}' was not published yet in '${config.packageName}'`);
    return;
  }

  // Replace the installed config packages by the one from this monorepo.
  // The whole package must be replaced, and not just the entry config file,
  // because Components.js resolves the imports within a config file against the installed config package.
  const monorepoConfigPath = configPackageDirs[config.packageName];
  if (!await pathExists(Path.join(monorepoConfigPath, 'components'))) {
    throw new Error(`Config package '${config.packageName}' has no built components, run the build first`);
  }
  for (const installedConfigPath of installedConfigPaths) {
    // eslint-disable-next-line no-console
    console.log(`      Injecting the monorepo '${config.packageName}' into ${installedConfigPath}`);
    await emptyDir(installedConfigPath);
    await copy(monorepoConfigPath, installedConfigPath, {
      filter: source => Path.basename(source) !== 'node_modules',
    });
  }

  // Run engine factory of the installed engine with the config from the current monorepo as test
  // eslint-disable-next-line no-console
  console.log(`    Running engine factory for '${engineName}' at version ${version}`);
  const injectedConfigPath = Path.join(installedConfigPaths[0], config.relativePath);
  await exec(`node -e '
    import { QueryEngineFactory } from "${engineName}";
    const factory = new QueryEngineFactory();
    const engine = await factory.create({
      configPath: "${injectedConfigPath}",
    });
    await engine.getResultMediaTypes();
  '`, {
    cwd: installPath,
    encoding: 'utf8',
  });
}

/**
 * Find all installed copies of the given package.
 * npm may keep both a hoisted and a nested copy, and Components.js can pick up either of them.
 * @param installPath An installation root directory.
 * @param packageName A package name.
 */
async function findInstalledPackages(installPath: string, packageName: string): Promise<string[]> {
  const modulesPath = Path.join(installPath, 'node_modules');
  const moduleRoots: string[] = [ modulesPath ];
  for (const entry of await readdir(modulesPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const packagePaths: string[] = [];
    if (entry.name.startsWith('@')) {
      const scopePath = Path.join(modulesPath, entry.name);
      for (const scopedEntry of await readdir(scopePath, { withFileTypes: true })) {
        if (scopedEntry.isDirectory()) {
          packagePaths.push(Path.join(scopePath, scopedEntry.name));
        }
      }
    } else {
      packagePaths.push(Path.join(modulesPath, entry.name));
    }
    for (const packagePath of packagePaths) {
      moduleRoots.push(Path.join(packagePath, 'node_modules'));
    }
  }

  const installedPaths: string[] = [];
  for (const moduleRoot of moduleRoots) {
    const installedPath = Path.join(moduleRoot, packageName);
    if (await pathExists(installedPath)) {
      installedPaths.push(installedPath);
    }
  }
  return installedPaths;
}

function semVerToString(version: SemVer): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function isSemVerEqual(semVer1: SemVer, semVer2: SemVer): boolean {
  return semVer1.major === semVer2.major && semVer1.minor === semVer2.minor && semVer1.patch === semVer2.patch;
}

function getSemVerFromConfigName(configName: string): ConfigSemVer | undefined {
  const match = /config-([a-z-]+)-v(\d+)-(\d+)-(\d+)\.json/u.exec(configName);
  if (match) {
    const [ , type, major, minor, patch ] = match;
    return {
      type,
      semver: {
        major: Number.parseInt(major, 10),
        minor: Number.parseInt(minor, 10),
        patch: Number.parseInt(patch, 10),
      },
    };
  }
  const match2 = /config-([a-z-]+)\.json/u.exec(configName);
  if (match2) {
    const [ , type ] = match2;
    return {
      type,
      semver: undefined,
    };
  }
  return undefined;
}

function getConfigTestRanges(applicableConfigs: EngineConfig[], engineConfigVersion: SemVer): ConfigTestRange[] {
  const configTestRanges: ConfigTestRange[] = [];
  applicableConfigs = applicableConfigs
    .sort((a, b) => a.path.length === b.path.length ? a.path.localeCompare(b.path) : a.path.length - b.path.length)
    .reverse();
  let lastVersion: SemVer | undefined;
  for (const applicableConfig of applicableConfigs) {
    configTestRanges.push({
      config: applicableConfig,
      minExclusive: applicableConfig.version.semver ?? { major: engineConfigVersion.major, minor: 0, patch: 0 },
      maxInclusive: lastVersion,
    });
    lastVersion = applicableConfig.version.semver;
  }
  return configTestRanges;
}

export type ConfigSemVer = {
  type: string;
  semver: SemVer | undefined;
};

export type SemVer = {
  major: number;
  minor: number;
  patch: number;
};

export type EngineConfig = {
  path: string;
  /**
   * The path of this config file relative to the root of its config package.
   */
  relativePath: string;
  /**
   * The name of the config package containing this config file.
   */
  packageName: string;
  version: ConfigSemVer;
};

export type ConfigTestRange = {
  config: EngineConfig;
  /**
   * The minimum version, exclusive the specified version.
   * For example, if this min value is 5.1.0, then allowed versions are 5.1.1, 5.1.2, 5.2.0, ...
   */
  minExclusive: SemVer;
  /**
   * The maximum version, inclusive the specified version.
   */
  maxInclusive: SemVer | undefined;
};
