// eslint-disable-next-line import/no-nodejs-modules
import { existsSync, readdirSync, readFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import * as Path from 'node:path';
import { BUNDLE_FILES } from './bundleSizes';

/**
 * A copy of a package that was bundled.
 */
export interface IPackageCopy {
  /**
   * The directory of the copy, relative to the monorepo.
   */
  path: string;
  version: string;
}

/**
 * A package of which multiple copies were included in a bundle.
 */
export interface IBundleDuplicate {
  bundle: string;
  packageName: string;
  copies: IPackageCopy[];
}

// Webpack prefixes sources with its namespace, while Vite uses paths relative to the source map.
const SOURCE_PREFIX_REGEX = /^webpack:\/\/[^/]*\//u;
// The greedy match finds the innermost node_modules directory.
const NODE_MODULES_PACKAGE_REGEX = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//u;
const WORKSPACE_PACKAGE_REGEX = /^((?:packages|engines)\/[^/]+)\//u;

/**
 * Determine the directory of the package that a bundled source file belongs to.
 * @param monorepoPath The absolute path to the monorepo.
 * @param bundleDir The absolute path to the directory of the source map.
 * @param source A source of the source map.
 * @return The package directory relative to the monorepo, or undefined if the source belongs to no package.
 */
export function getSourcePackageDir(monorepoPath: string, bundleDir: string, source: string): string | undefined {
  // Rollup marks virtual modules with a null byte, and appends queries to some modules.
  const cleaned = source.replace(SOURCE_PREFIX_REGEX, '').replace(/^\0/u, '').replace(/\?.*$/u, '');
  const relative = Path.relative(monorepoPath, Path.resolve(bundleDir, cleaned)).split(Path.sep).join('/');
  return NODE_MODULES_PACKAGE_REGEX.exec(`/${relative}`)?.[1].slice(1) ??
    WORKSPACE_PACKAGE_REGEX.exec(relative)?.[1];
}

/**
 * Determine the name and version of a package.
 * @param monorepoPath The absolute path to the monorepo.
 * @param packageDir The package directory relative to the monorepo.
 */
export function readPackageInfo(monorepoPath: string, packageDir: string): { name: string; version: string } {
  const packageJsonPath = Path.join(monorepoPath, packageDir, 'package.json');
  const fallbackName = packageDir.slice(packageDir.lastIndexOf('node_modules/') + 'node_modules/'.length);
  if (!existsSync(packageJsonPath)) {
    return { name: fallbackName, version: 'unknown' };
  }
  const { name, version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return { name: name ?? fallbackName, version: version ?? 'unknown' };
}

/**
 * Find the packages of which multiple copies were included in a bundle, based on its source map.
 * @param monorepoPath The absolute path to the monorepo.
 * @param bundle The name of the bundle.
 * @param sourceMapPath The absolute path to the source map of the bundle.
 */
export function findDuplicatesInSourceMap(
  monorepoPath: string,
  bundle: string,
  sourceMapPath: string,
): IBundleDuplicate[] {
  const { sources } = <{ sources: string[] }> JSON.parse(readFileSync(sourceMapPath, 'utf8'));
  const bundleDir = Path.dirname(sourceMapPath);
  const packageDirs = new Set(sources
    .map(source => getSourcePackageDir(monorepoPath, bundleDir, source))
    .filter((packageDir): packageDir is string => packageDir !== undefined));
  const copiesByName = new Map<string, IPackageCopy[]>();
  for (const packageDir of packageDirs) {
    const { name, version } = readPackageInfo(monorepoPath, packageDir);
    copiesByName.set(name, [ ...copiesByName.get(name) ?? [], { path: packageDir, version }]);
  }
  return [ ...copiesByName.entries() ]
    .filter(([ , copies ]) => copies.length > 1)
    .sort(([ left ], [ right ]) => left.localeCompare(right))
    .map(([ packageName, copies ]) => ({
      bundle,
      packageName,
      copies: copies.sort((left, right) => left.path.localeCompare(right.path)),
    }));
}

/**
 * Find the packages of which multiple copies were included in the browser bundles of all engines in a monorepo.
 * @param monorepoPath The path to the monorepo, of which the bundles have been built with source maps.
 */
export function findBundleDuplicates(monorepoPath: string): IBundleDuplicate[] {
  const absoluteMonorepoPath = Path.resolve(monorepoPath);
  const enginesPath = Path.join(absoluteMonorepoPath, 'engines');
  let bundles = 0;
  const duplicates = readdirSync(enginesPath)
    .sort((left, right) => left.localeCompare(right))
    .flatMap(engine => BUNDLE_FILES.flatMap(([ bundler, file ]) => {
      const sourceMapPath = Path.join(enginesPath, engine, `${file}.map`);
      if (!existsSync(sourceMapPath)) {
        return [];
      }
      bundles++;
      return findDuplicatesInSourceMap(absoluteMonorepoPath, `${engine} (${bundler})`, sourceMapPath);
    }));
  if (bundles === 0) {
    throw new Error(`No source maps of browser bundles were found in ${enginesPath}`);
  }
  return duplicates;
}

/**
 * Render a report of duplicate packages.
 * @param duplicates The duplicate packages.
 */
export function renderBundleDuplicates(duplicates: IBundleDuplicate[]): string {
  return duplicates
    .map(({ bundle, packageName, copies }) => `${bundle}: ${packageName}\n${copies
      .map(({ path, version }) => `  - ${version} in ${path}`).join('\n')}\n`)
    .join('');
}

/**
 * Check the browser bundles of a monorepo for duplicate packages.
 * @param monorepoPath The path to the monorepo, of which the bundles have been built with source maps.
 * @param allowed The names of the packages that may be duplicated.
 * @return The report, and if the check failed.
 */
export function checkBundleDuplicates(monorepoPath: string, allowed: string[]): { report: string; failed: boolean } {
  const duplicates = findBundleDuplicates(monorepoPath);
  const disallowed = duplicates.filter(duplicate => !allowed.includes(duplicate.packageName));
  const unused = allowed.filter(name => !duplicates.some(duplicate => duplicate.packageName === name));
  const lines: string[] = [];
  if (disallowed.length > 0) {
    lines.push(
      'Multiple copies of the following packages were bundled.',
      'Align their version ranges or deduplicate yarn.lock, so that one copy is installed for each of them.\n',
      renderBundleDuplicates(disallowed),
    );
  } else {
    lines.push('No disallowed duplicate packages were found in the browser bundles.\n');
  }
  if (unused.length > 0) {
    lines.push(`These packages are allowed to be duplicated, but are not anymore, so they can be removed from the allowed packages: ${unused.join(', ')}\n`);
  }
  return { report: lines.join('\n'), failed: disallowed.length > 0 };
}
