#!/usr/bin/env node

import {compileConfig} from "componentsjs";
import * as fs from "fs";
import {ParsedArgs} from "minimist";
import minimist = require('minimist');
import * as Path from "path";
import {Stream} from "stream";

const args: ParsedArgs = minimist(process.argv.slice(2));
if (args._.length !== 1 || !args.o || args.h || args.help) {
  console.error(`comunica-package packages a Comunica config file into a new NPM package

Usage:
  comunica-package http://example.org/myInstance -c config.jsonld -o my-engine
  cat config.jsonld | compile-config http://example.org/myInstance -o my-engine

Options:
  -o      [Required] The package name to generate
  -c      Path to a Comunica config file, if not provided, the config must be provided via stdin
  -p      The main module path, if not provided, this defaults to the directory of the packager
  -g      If global modules should be included as well next to local modules.
  -e      The instance by config URI that will be exported, by default this is the provided instance URI.
  --help  print this help message
      `);
  process.exit(1);
}

const configResourceUri: string = args._[0];

// Check if the package name is valid
const packageName = args.o;
if (!/^[a-zA-Z0-9-]*$/.test(packageName)) {
  throw new Error('Invalid package name: ' + packageName);
}

// Make the target package directory if it does not exist yet.
let packageJson: any = {};
if (!fs.existsSync(packageName)) {
  fs.mkdirSync(packageName);
} else if (!fs.statSync(packageName).isDirectory()) {
  throw new Error('The target package already exists, but it is not a directory!');
} else {
  // Reuse contents if a package.json file already exists
  if (fs.existsSync(packageName + '/package.json')) {
    // tslint:disable-next-line:no-var-requires
    packageJson = require(process.cwd() + '/' + packageName + '/package.json');
  }
}

let configStreamRaw: Stream;
let configPath: string;
if (args.c) {
  configStreamRaw = fs.createReadStream(args.c, { encoding: 'utf8' });
  configPath = args.c;
} else {
  configStreamRaw = process.stdin;
  configPath = '.';
}

let mainModulePath: string;
if (args.p) {
  mainModulePath = Path.resolve(process.cwd(), args.p);
} else {
  mainModulePath = __dirname + '/../';
}

let exportVariableName: string = null;
if (args.e) {
  exportVariableName = args.e;
}

const scanGlobal: boolean = !!args.g;

const dependencyRegex = /require\('([^']*)'\)/g;
// tslint:disable-next-line:no-var-requires
const referencePackageJson = require(__dirname + '/../package.json');
compileConfig({ mainModulePath, scanGlobal }, configPath, configStreamRaw, configResourceUri,
  exportVariableName).then((document: string) => {
    // Find dependency package names
    const dependencies: {[id: string]: string} = {};
    let match;
    // tslint:disable-next-line:no-conditional-assignment
    while (match = dependencyRegex.exec(document)) {
      const dependencyName: string = match[1];
      dependencies[dependencyName] = referencePackageJson.dependencies[dependencyName];
    }

    // Build our package.json file
    packageJson.name = packageName;
    packageJson.main = 'index.js';
    packageJson.dependencies = dependencies;

    // Write output files
    fs.writeFileSync(packageName + '/index.js', document);
    fs.writeFileSync(packageName + '/package.json', JSON.stringify(packageJson, null, '  '));
  }).catch(console.error);
