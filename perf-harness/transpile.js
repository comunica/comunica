// Transpile changed TypeScript files to JavaScript next to them, without type checking (isolatedModules).
// Usage: node perf-harness/transpile.js <file.ts>...
const fs = require('node:fs');
const path = require('node:path');
const ts = require(path.resolve(__dirname, '../node_modules/typescript'));
const { config } = ts.readConfigFile(path.resolve(__dirname, '../tsconfig.json'), ts.sys.readFile);
const { options } = ts.convertCompilerOptionsFromJson(config.compilerOptions, path.resolve(__dirname, '..'));
for (const file of process.argv.slice(2)) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { ...options, sourceMap: false, declaration: false },
    fileName: file,
  });
  fs.writeFileSync(file.replace(/\.ts$/u, '.js'), outputText);
  console.log(`transpiled ${file}`);
}
