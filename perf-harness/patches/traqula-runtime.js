// Prototype runtime patch for traqula (no files are modified): skip parse-time validations that cannot apply.
// Enabled per call with the traqulaFast prototype flag. Load with `node -r` or require it before the engine.
const path = require('node:path');

const root = path.resolve(__dirname, '../../node_modules/@traqula');
const validators = require(`${root}/rules-sparql-1-1/dist/cjs/lib/validation/validators.js`);
const { Parser } = require(`${root}/parser-sparql-1-2/dist/cjs/lib/Parser.js`);
const F = new (require(`${root}/rules-sparql-1-1/dist/cjs/lib/astFactory.js`).AstFactory)();

let queryHasBlankNodeLabels = true;

const parse = Parser.prototype.parse;
Parser.prototype.parse = function(query, context) {
  queryHasBlankNodeLabels = query.includes('_:');
  return parse.call(this, query, context);
};

// NOTE 13 only constrains BIND patterns
const checkNote13 = validators.checkNote13;
validators.checkNote13 = function(patterns) {
  if (globalThis.__proto?.traqulaFast && !patterns.some(pattern => F.isPatternBind(pattern))) {
    return;
  }
  return checkNote13(patterns);
};

// Blank node label scoping only matters if the query contains blank node labels
const checkBlankNodeBGPScope = validators.checkBlankNodeBGPScope;
validators.checkBlankNodeBGPScope = function(patterns) {
  if (globalThis.__proto?.traqulaFast && !queryHasBlankNodeLabels) {
    return;
  }
  return checkBlankNodeBGPScope(patterns);
};
