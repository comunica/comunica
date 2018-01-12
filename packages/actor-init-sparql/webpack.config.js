const path = require('path');

module.exports = {
  entry: 'test.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};

node ../../node_modules/componentsjs/bin/compile-config.js urn:comunica:my -c config/config-default.json -e urn:comunica:sparqlinit