#!/usr/bin/env bash
# Update softwareVersion and releaseDate in publiccode.yml to match the current lerna version.
# This script is called automatically during `lerna version` (via the `version` lifecycle hook).

export VERSION=$(node -p "require('./lerna.json').version")
export RELEASE_DATE=$(date -u +%Y-%m-%d)

node -e "
const fs = require('fs');
const version = process.env.VERSION;
const releaseDate = process.env.RELEASE_DATE;
let content = fs.readFileSync('publiccode.yml', 'utf8');
content = content.replace(/^softwareVersion: .*/m, 'softwareVersion: ' + version);
content = content.replace(/^releaseDate: .*/m, 'releaseDate: ' + releaseDate);
fs.writeFileSync('publiccode.yml', content);
"
