const {loadPackages, exec, iter} = require('lerna-script')
const checkDeps = require('depcheck')
const path = require('path');
const { readFileSync, writeFileSync, readdirSync, readdir } = require('fs');

function ensureDependency({ checkedDeps, dependency, dependant }, log) {
  if (!checkedDeps.dependencies.includes(dependency)) {
    checkedDeps.missing[dependency] = [dependant];
  }
  checkedDeps.using[dependency] = [dependant];
}

async function depInfo({ location, name }, log) {
  const folders = readdirSync(location, { withFileTypes: true });

  const { files } = JSON.parse(readFileSync(path.join(location, 'package.json'), 'utf8'));
  let ignore;
  let checkedDeps;
  if (location.startsWith(path.join(__dirname, '/engines'))) {
    // First check whether we have a default engine file
    if (!folders.some(elem => elem.name === 'engine-default.js')) {
      return {
        unusedDeps: [],
        missingDeps: [],
        allDeps: [],
      };
    }
    ignore = files ? folders.filter(elem => files.every(file => !file.startsWith(elem.name))) : folders;
    ignore = ignore.map(x => x.isDirectory() ? `${x.name}/**` : x.name)

    // Add a nonExisting path to bypass the automatic .gitignore parsing: https://github.com/depcheck/depcheck/issues/497
    checkedDeps = await checkDeps(location,
      { ignorePath: 'falsePath', ignorePatterns: ignore }, val => val);
    ensureDependency({
      checkedDeps, dependency: '@comunica/runner', dependant: path.join(location, 'engine-default.js') }, log);
    ensureDependency({
      checkedDeps, dependency: '@comunica/config-query-sparql', dependant: path.join(location, 'engine-default.js') }, log);
  } else {
    ignore = files ? folders.filter(elem => files.every(file => !file.startsWith(elem.name))) : folders;
    ignore = ignore.map(x => x.isDirectory() ? `${x.name}/**` : x.name)

    checkedDeps = await checkDeps(location, { ignorePatterns: ignore }, val => val);
  }
  let {dependencies, devDependencies, missing, using} = checkedDeps;

  if (Object.values(using).flat().some(file =>
    readFileSync(file, 'utf8').toString().includes('require(\'process/\')') ||
    readFileSync(file, 'utf8').toString().includes('require(\"process/\")')
    )) {
      if (dependencies.includes('process')) {
        // If we know it exists and is in the dependency array, remove it so that no errors are thrown
        dependencies = dependencies.filter(dep => dep !== 'process');
      } else {
        // If it is *not* declared in the dependencies then mark it as missing
        missing['process'] = missing['process'] || [];
      }
  }

  return {
    unusedDeps: [...dependencies, ...devDependencies].filter(elem => !Object.keys(using).includes(elem)),
    missingDeps: Object.keys(missing),
    allDeps: Object.keys(using),
  }
}

async function depfixTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));

  await iter.forEach(packages, { log })(async package => {
    log.info(package.name)

    const { missingDeps, unusedDeps, allDeps } = await depInfo(package);

    if (allDeps.includes(package.name))
      log.error('     package is a dependency of itself')

    if (missingDeps.length > 0) {
      try {
        log.info('    add:', missingDeps.join(', '))
        await exec.command(package)(`yarn add ${missingDeps.join(' ')}`);
      } catch (e) {
        for (const dep of missingDeps) {
          try {
            await exec.command(package)(`yarn add ${dep}`);
          } catch (e) {
            log.error('    CANNOT ADD:', dep);
          }
        }
      }
    }

    if (unusedDeps.length > 0) {
      try {
        log.info('    remove:', unusedDeps.join(', '))
        await exec.command(package)(`yarn remove ${unusedDeps.join(' ')}`);
      } catch (e) {
        for (const dep of unusedDeps) {
          try {
            await exec.command(package)(`yarn remove ${dep}`);
          } catch (e) {
            log.error('    CANNOT REMOVE:', dep);
          }
        }
      }
    }

    writeFileSync(path.join(package.location, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  })
}

async function depcheckTask(log) {
  const packages = await (log.packages || loadPackages());

  return iter.forEach(packages, { log })(async package => {
    const { missingDeps, unusedDeps, allDeps } = await depInfo(package)

    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies:  ${missingDeps.join(', ')} from ${package.name}`);
    }

    if (unusedDeps.length > 0) {
      throw new Error(`Extra dependencies: ${unusedDeps.join(', ')} in ${package.name}`);
    }

    if (allDeps.includes(package.name))
      throw new Error(`${package.name} is a dependency of itself`);
  })
}

module.exports.depfixTask = depfixTask
module.exports.depcheckTask = depcheckTask

const ncu = require('npm-check-updates');
async function updateTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(
    package => package.location.startsWith(path.join(__dirname, '/packages')) ||
      package.location.startsWith(path.join(__dirname, '/engines'))
  );

  await iter.forEach(packages, { log })(async package => {
    const upgraded = await ncu.run({
      // Pass any cli option
      packageFile: path.join(package.location, 'package.json'),
      upgrade: true,
      target: 'minor'
    });
    log.info(package.name, upgraded);
  })
}

async function updateTaskMajor(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));

  await iter.forEach(packages, { log })(async package => {
    const upgraded = await ncu.run({
      // Pass any cli option
      packageFile: path.join(package.location, 'package.json'),
    });
    log.info(package.name, upgraded);
  })
}

module.exports.updateTask = updateTask
module.exports.updateTaskMajor = updateTaskMajor
