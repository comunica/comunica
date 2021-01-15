#!/usr/bin/env node
import { compileConfig } from 'componentsjs';

// Compiles a configuration to a module (single file) that exports the instantiated instance,
// where all dependencies are injected.
// This is a simplified version of components-compile-config that is shipped with Components.js.

const args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write('Usage: comunica-compile-config path/to/config.json [urn:of:init:actor]\n');
  process.exit(1);
}

const mainModulePath: string = process.cwd();
const configResourceUri = 'urn:comunica:my';
const configPath: string = args[0];
let exportVariableName = 'urn:comunica:sparqlinit';
if (args.length > 1) {
  exportVariableName = args[1];
}

compileConfig(mainModulePath, configPath, configResourceUri, exportVariableName)
  .then(out => {
    // This instantiation is unneeded (MUST be done for excluding Components.js in browser environnments)
    out = out.replace('new (require(\'@comunica/runner\').Runner)', '');
    process.stdout.write(`${out}\n`);
  }).catch(error => {
    process.stderr.write(`${error.stack}\n`);
    process.exit(1);
  });
