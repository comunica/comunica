// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync, readdirSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'node:path';

// eslint-disable-next-line ts/no-require-imports
import checkDeps = require('depcheck');

// eslint-disable-next-line ts/no-var-requires,ts/no-require-imports
const { getPackages } = require('@manypkg/get-packages');

const configPackage = process.argv[2];

function ensureDependency({ checkedDeps, dependency, dependant }: any): void {
  if (!checkedDeps.dependencies.includes(dependency)) {
    checkedDeps.missing[dependency] = [ dependant ];
  }
  checkedDeps.using[dependency] = [ dependant ];
}

/**
 * Filter out @types/ dependencies that should be used but are not registered as used by depcheck: https://github.com/depcheck/depcheck/issues/735#issuecomment-1689905150
 * We know the @types/ dependency is used if it its normal dependency is used. (Because we uny use typescript files)
 */
function filterTypeUsedTypeDependencies({ dependencies, using }: any): any {
  const newDependencies = [];
  for (const dependency of dependencies) {
    if (dependency.startsWith('@types/') && Object.keys(using).includes(dependency.slice(7))) {
      continue;
    }
    newDependencies.push(dependency);
  }
  return newDependencies;
}

async function depInfo(pckg: any): Promise<any> {
  const folders = readdirSync(pckg.dir, { withFileTypes: true });

  const { files } = JSON.parse(readFileSync(join(pckg.dir, 'package.json'), 'utf8'));
  let ignore;
  let checkedDeps;
  if (pckg.relativeDir.startsWith('engines/')) {
    // First check whether we have a default engine file
    if (!folders.some(elem => elem.name === 'engine-default.js')) {
      return {
        unusedDeps: [],
        missingDeps: [],
        allDeps: [],
      };
    }
    ignore = files ? folders.filter(elem => files.every((file: any) => !file.startsWith(elem.name))) : folders;
    ignore = ignore.map(x => x.isDirectory() ? `${x.name}/**` : x.name);

    // Add a nonExisting path to bypass the automatic .gitignore parsing: https://github.com/depcheck/depcheck/issues/497
    checkedDeps = await checkDeps(pckg.dir, { ignorePath: 'falsePath', ignorePatterns: ignore }, (val: any) => val);
    ensureDependency({
      checkedDeps,
      dependency: '@comunica/runner',
      dependant: join(pckg.dir, 'engine-default.js'),
    });
    ensureDependency({
      checkedDeps,
      dependency: configPackage,
      dependant: join(pckg.dir, 'engine-default.js'),
    });
  } else {
    ignore = files ? folders.filter(elem => files.every((file: any) => !file.startsWith(elem.name))) : folders;
    ignore = ignore.map(x => x.isDirectory() ? `${x.name}/**` : x.name);

    checkedDeps = await checkDeps(pckg.dir, { ignorePatterns: ignore }, (val: any) => val);
  }
  let { dependencies, devDependencies, missing, using } = checkedDeps;

  dependencies = filterTypeUsedTypeDependencies({ dependencies, using });

  if (Object.values(using).flat().some(file =>
    readFileSync(<any> file, 'utf8').toString().includes('require(\'process/\')') ||
    readFileSync(<any> file, 'utf8').toString().includes('require("process/")'))) {
    if (dependencies.includes('process')) {
      // If we know it exists and is in the dependency array, remove it so that no errors are thrown
      dependencies = dependencies.filter((dep: any) => dep !== 'process');
    } else {
      // If it is *not* declared in the dependencies then mark it as missing
      missing.process = missing.process || [];
    }
  }

  return {
    unusedDeps: [ ...dependencies, ...devDependencies ].filter(elem => !Object.keys(using).includes(elem)),
    missingDeps: Object.keys(missing),
    allDeps: Object.keys(using),
  };
}

async function depcheckTask(): Promise<void> {
  const packages = (await getPackages(process.cwd())).packages.filter(
    (pckg: any) => pckg.relativeDir.startsWith('packages/') ||
      pckg.relativeDir.startsWith('engines/'),
  );

  const failures = [];
  for (const pckg of packages) {
    const { missingDeps, unusedDeps, allDeps } = await depInfo(pckg);

    if (missingDeps.length > 0) {
      failures.push(`Missing dependencies:  ${missingDeps.join(', ')} from ${pckg.packageJson.name}`);
    }

    if (unusedDeps.length > 0) {
      failures.push(`Extra dependencies: ${unusedDeps.join(', ')} in ${pckg.packageJson.name}`);
    }

    if (allDeps.includes(pckg.packageJson.name)) {
      failures.push(`${pckg.packageJson.name} is a dependency of itself`);
    }

    // Now check all '@rdfjs/types' use a star ("*") import
    for (const dep of Object.keys(pckg.packageJson.dependencies ?? {})) {
      if (dep === '@rdfjs/types' && pckg.packageJson.dependencies[dep] !== '*') {
        failures.push(`Not using '*' import for ${dep} in ${pckg.packageJson.name}`);
      }
    }
  }
  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`Depcheck failures: \n- ${failures.join('\n- ')}`);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }
}

module.exports.depcheckTask = depcheckTask;
