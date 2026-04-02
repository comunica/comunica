#!/usr/bin/env bash
# Update softwareVersion and releaseDate in publiccode.yml to match the current lerna version.
# This script is called automatically during `lerna version` (via the `version` lifecycle hook).

version=$(node -p "require('./lerna.json').version")
release_date=$(date -u +%Y-%m-%d)

node -e "
const fs = require('fs');
let content = fs.readFileSync('publiccode.yml', 'utf8');
content = content.replace(/^softwareVersion: .*/m, 'softwareVersion: \"${version}\"');
content = content.replace(/^releaseDate: .*/m, 'releaseDate: \"${release_date}\"');
fs.writeFileSync('publiccode.yml', content);
"
