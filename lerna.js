
const {loadPackages, exec} = require('lerna-script')
const checkDeps = require('depcheck')
const path = require('path');

async function depcheckTask({ log, packages }) {
  const lernaPackages = await (packages || loadPackages());
  console.log(log)
  for (const package of lernaPackages.filter(package => package.location.startsWith(path.join(__dirname, '/packages')))) {
    const {dependencies, devDependencies, missing, using} = await checkDeps(package.location, { ignorePatterns: [
      // files matching these patterns will be ignored
      'test/*',
    ], }, val => val);
    
    const missing_deps = Object.keys(missing)
    if (missing_deps.length > 0) {
      await exec.command(package)(`yarn add ${missing_deps.join(' ')}`, { log });
      break;
    }

    const unused_deps = [...dependencies, ...devDependencies].filter(elem => !Object.keys(using).includes(elem));
    if (unused_deps.length > 0) {
      await exec.command(package)(`yarn remove ${unused_deps.join(' ')}`, { log });
      break;
    }
  }
}

module.exports.depcheckTask = depcheckTask
