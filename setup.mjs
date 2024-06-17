/* eslint-disable no-sync, import/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';

for (const pkg of fs.readdirSync(path.join('packages'))) {
  if (pkg.includes('init-sparql') || pkg === 'packager') {
    continue;
  }

  for (const [ name, template ] of [[ 'rollup.config.mjs', 'rollup.config.template.mjs' ], [ 'tsconfig.json', 'tsconfig.template.json' ]]) {
    fs.writeFileSync(path.join('packages', pkg, name), fs.readFileSync(template));
  }
  // Const pkgJson = JSON.parse(fs.readFileSync(path.join('packages', pkg, 'package.json')));
  // pkgJson.main = 'lib/index.js';
  // pkgJson.module = 'lib/index.mjs';
  // pkgJson.typings = 'lib/index';
  // pkgJson.scripts.rollup = "rollup --config rollup.config.mjs";
  // fs.writeFileSync(path.join('packages', pkg, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');
}
