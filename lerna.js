const {loadPackages, exec, iter} = require('lerna-script')
const checkDeps = require('depcheck')
const path = require('path');
const { readFileSync, writeFileSync } = require('fs');

async function depfixTask(log) {
  const packages = (await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages')));
  const resolutions = Object.keys(JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8')).resolutions ?? {});

  await iter.forEach(packages, { log })(async package => {
    const {dependencies, devDependencies, missing, using} = await checkDeps(package.location, { ignorePatterns: [
      // files matching these patterns will be ignored
      'test/*',
    ], }, val => val);

    log.info(package.name)
    
    const missing_deps = Object.keys(missing)
    if (missing_deps.length > 0) {
      try {
        log.info('    add:', missing_deps.join(', '))
        await exec.command(package)(`yarn add ${missing_deps.join(' ')}`);
      } catch (e) {
        for (const dep of missing_deps) {
          try {
            await exec.command(package)(`yarn add ${dep}`);
          } catch (e) {
            log.error('    CANNOT ADD:', dep);
          }
        }
      }
    }

    const unused_deps = [...dependencies, ...devDependencies].filter(elem => !Object.keys(using).includes(elem));
    if (unused_deps.length > 0) {
      try {
        log.info('    remove:', unused_deps.join(', '))
        await exec.command(package)(`yarn remove ${unused_deps.join(' ')}`);
      } catch (e) {
        for (const dep of unused_deps) {
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
    const {dependencies, devDependencies, missing, using} = await checkDeps(package.location, { ignorePatterns: [
      // files matching these patterns will be ignored
      'test/*',
    ], }, val => val);

    const missing_deps = Object.keys(missing)
    if (missing_deps.length > 0) {
      throw new Error('Missing dependencies: ' + missing_deps.join(', '), 'from', package.name)
    }

    const unused_deps = [...dependencies, ...devDependencies].filter(elem => !Object.keys(using).includes(elem));
    if (unused_deps.length > 0) {
      throw new Error('Extra dependencies: ' + unused_deps.join(', '), 'in', package.name)
    }

    // Now check all resolutions use a star ("*") import
    const packageJson = JSON.parse(readFileSync(path.join(package.location, 'package.json'), 'utf8'));
    for (const dep of Object.keys(packageJson.dependencies ?? {})) {
      if (resolutions.includes(dep) && packageJson.dependencies[dep] !== '*') {
        throw new Error('Resolution not using \'*\' import for', dep, 'in', package.name)
      }
    }
  })
}

module.exports.depfixTask = depfixTask
module.exports.depcheckTask = depcheckTask
