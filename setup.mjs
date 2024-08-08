/* eslint-disable no-sync, import/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';

for (const pkg of fs.readdirSync(path.join('packages'))) {
  if (pkg.includes('init-sparql') || pkg === 'packager' || pkg === '@comunica/actor-http-native') {
    continue;
  }

  // for (const [ name, template ] of [[ 'rollup.config.mjs', 'rollup.config.template.mjs' ], [ 'tsconfig.json', 'tsconfig.template.json' ]]) {
  //   fs.writeFileSync(path.join('packages', pkg, name), fs.readFileSync(template));
  // }
  const pkgJson = JSON.parse(fs.readFileSync(path.join('packages', pkg, 'package.json')));
  pkgJson.type = 'module';
  pkgJson.main = 'lib/index.js';
  pkgJson.module = 'lib/index.js';
  pkgJson.typings = 'lib/index.d.ts';
  // pkgJson.scripts.rollup = "rollup --config rollup.config.mjs";
  fs.writeFileSync(path.join('packages', pkg, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');
}
