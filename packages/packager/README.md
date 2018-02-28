# Comunica Packager

A tool for packaging Comunica modules in a single NPM package.

## Usage

Invoke the packager using a config file as follows:

```bash
$ comunica-package urn:comunica:my -c config/config-default.json -e urn:comunica:sparqlinit -o my-sparql-engine 
```

This will create a directory `my-sparql-engine` containing new `package.json` and `index.js` files.
