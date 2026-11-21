// Adapts the webpack config of the web client generator to bundle the packages of this monorepo.
const path = require('node:path');

const generatorPath = path.dirname(require.resolve('@comunica/web-client-generator/package.json'));
const webpack = require(require.resolve('webpack', { paths: [ generatorPath ]}));
const config = require('@comunica/web-client-generator/webpack.config.js');

const monorepoPath = path.resolve(__dirname, '..');
const sourceMaps = process.env.WEB_CLIENT_SOURCE_MAPS !== 'false';

for (const entry of config) {
  // Builds run from the monorepo, which does not contain the loaders of the generator.
  entry.resolveLoader = { modules: [ 'node_modules', path.join(__dirname, 'node_modules') ]};

  // Webpack >= 5.108 would otherwise resolve the lib/*.ts sources instead of the compiled lib/*.js files.
  entry.experiments = { ...entry.experiments, typescript: false };

  // Resolve all Comunica packages from the monorepo, instead of the released ones that the generator depends on.
  entry.plugins.push(new webpack.NormalModuleReplacementPlugin(/^@comunica\//u, (resource) => {
    resource.context = monorepoPath;
  }));

  // The monorepo packages are compiled already, just like the released packages in node_modules.
  for (const rule of entry.module.rules) {
    if (rule.loader === 'babel-loader') {
      rule.exclude = [ rule.exclude, path.join(monorepoPath, 'engines'), path.join(monorepoPath, 'packages') ];
    }
  }

  if (!sourceMaps) {
    entry.devtool = false;
  }
}

module.exports = config;
