#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { renderComparisonComment } from '../lib/performanceComparison';

// Usage: performance-comparison <head ghbench JSON> <base ghbench JSON> <head sha> <base sha> <CI run URL>
const [ headFile, baseFile, headSha, baseSha, runUrl ] = process.argv.slice(2);
process.stdout.write(renderComparisonComment(
  JSON.parse(readFileSync(headFile, 'utf8')),
  JSON.parse(readFileSync(baseFile, 'utf8')),
  { headSha, baseSha, runUrl },
));
