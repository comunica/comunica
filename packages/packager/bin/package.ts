#!/usr/bin/env node
import * as fs from 'fs';
import * as Path from 'path';
import { compileConfig } from 'componentsjs';
import type { ParsedArgs } from 'minimist';
import minimist = require('minimist');

const args: ParsedArgs = minimist(process.argv.slice(2));
if (args._.length > 0 || args.h || args.help) {
  process.stderr.write(`comunica-package packages a Comunica config file into a new NPM package

Usage:
  comunica-package -c config.jsonld -o my-engine
  cat config.jsonld | comunica-package -o my-engine

Options:
  -o      The package name to generate, if not provided, the list of dependencies is printed to stdout.
  -c      Path to a Comunica config file, if not provided, the config must be provided via stdin
  -p      The main module path, if not provided, this defaults to the directory of the packager
  -e      The instance by config URI that will be exported, by default this is the provided instance URI.
  --help  print this help message
`);
  process.exit(1);
}

// Check if the package name is valid
const packageName = args.o;
let packageJson: any | undefined;
if (packageName) {
  if (!/^[\dA-Za-z-]*$/u.test(packageName)) {
    throw new Error(`Invalid package name: ${packageName}`);
  }

  /* eslint-disable no-sync */

  // Make the target package directory if it does not exist yet.
  packageJson = {};
  if (!fs.existsSync(packageName)) {
    fs.mkdirSync(packageName);
  } else if (!fs.statSync(packageName).isDirectory()) {
    throw new Error('The target package already exists, but it is not a directory!');
  } else if (fs.existsSync(`${packageName}/package.json`)) {
    // Reuse contents if a package.json file already exists
    packageJson = require(`${process.cwd()}/${packageName}/package.json`);
  }
}

const configPath: string = args.c ? args.c : '.';

const mainModulePath: string = args.p ? Path.resolve(process.cwd(), args.p) : `${__dirname}/../`;

let exportVariableName: string | undefined;
if (args.e) {
  exportVariableName = args.e;
}

const dependencyRegex = /require\('([^']*)'\)/ug;

const referencePackageJson = require(`${__dirname}/../package.json`);
compileConfig(mainModulePath, configPath, 'urn:comunica:default:Runner', exportVariableName, false, true)
  .then((document: string) => {
    // Find dependency package names
    const dependencies: Record<string, string> = {};
    let match;
    const dependencyNames: string[] = [];
    // eslint-disable-next-line no-cond-assign
    while (match = dependencyRegex.exec(document)) {
      dependencyNames.push(match[1]);
    }
    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    for (const dependencyName of dependencyNames.sort()) {
      const packageJsonDependency = require(`${dependencyName}/package.json`);
      dependencies[dependencyName] = `^${packageJsonDependency.version}`;
    }

    if (packageJson) {
      // Build our package.json file
      packageJson.name = packageName;
      packageJson.main = 'index.js';
      packageJson.dependencies = dependencies;

      // Write output files
      fs.writeFileSync(`${packageName}/index.js`, document);
      fs.writeFileSync(`${packageName}/package.json`, JSON.stringify(packageJson, null, '  '));
    } else {
      // If no output package was provided, print the dependency list to stdout
      process.stdout.write(`${JSON.stringify(dependencies, null, '  ')}\n`);
    }
  }).catch(error => process.stderr.write(`${error}\n`));

/* eslint-enable no-sync */
