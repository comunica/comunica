const {loadPackages, exec, iter} = require('lerna-script')
const checkDeps = require('depcheck')
const path = require('path');

async function depfixTask(log) {
  return iter.forEach((await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages'))), { log })(async package => {
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
  })
}

async function depcheckTask(log) {
  return iter.forEach((await (log.packages || loadPackages())).filter(package => package.location.startsWith(path.join(__dirname, '/packages'))), { log })(async package => {
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
  })
}

module.exports.depfixTask = depfixTask
module.exports.depcheckTask = depcheckTask
