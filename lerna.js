const {loadPackages, exec, iter} = require('lerna-script')
const checkDeps = require('depcheck')
const path = require('path');
const { readFileSync, writeFileSync, readdirSync, readdir } = require('fs');

async function depInfo({ location, name }, log) {
  const folders = readdirSync(location, { withFileTypes: true });

  const { files } = JSON.parse(readFileSync(path.join(location, 'package.json'), 'utf8'));
  let ignore = files ? folders.filter(elem => files.every(file => !file.startsWith(elem.name))) : folders;
  ignore = ignore.map(x => x.isDirectory() ? `${x.name}/**` : x.name)

  const {dependencies, devDependencies, missing, using} = await checkDeps(location, { ignorePatterns: ignore }, val => val);

  return {
    unusedDeps: [...dependencies, ...devDependencies].filter(elem => !Object.keys(using).includes(elem)),
    missingDeps: Object.keys(missing),
    allDeps: Object.keys(using),
  }
}

async function depfixTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));
  const resolutions = Object.keys(JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8')).resolutions ?? {});

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

    // Now fix up any resolutions to use a star ("*") import
    const packageJson = JSON.parse(readFileSync(path.join(package.location, 'package.json'), 'utf8'));
    for (const dep of Object.keys(packageJson.dependencies ?? {})) {
      if (resolutions.includes(dep) && packageJson.dependencies[dep] !== '*') {
        log.info('    converting to \'*\' import for', dep)
        packageJson.dependencies[dep] = '*';
      }
    }
    writeFileSync(path.join(package.location, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  })
}

async function depcheckTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));
  const resolutions = Object.keys(JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8')).resolutions ?? {});

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


    // Now check all resolutions use a star ("*") import
    const packageJson = JSON.parse(readFileSync(path.join(package.location, 'package.json'), 'utf8'));
    for (const dep of Object.keys(packageJson.dependencies ?? {})) {
      if (resolutions.includes(dep) && packageJson.dependencies[dep] !== '*') {
        throw new Error(`Resolution not using \'*\' import for ${dep} in ${package.name}`);
      }
    }
  })
}

module.exports.depfixTask = depfixTask
module.exports.depcheckTask = depcheckTask

const ncu = require('npm-check-updates');
async function updateTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));

  await iter.forEach(packages, { log })(async package => {
    const upgraded = await ncu.run({
      // Pass any cli option
      packageFile: path.join(package.location, 'package.json'),
      upgrade: true,
      // Defaults:
      // jsonUpgraded: true,
      // silent: true,
    });
    log.info(package.name, upgraded);
  })
}

module.exports.updateTask = updateTask
