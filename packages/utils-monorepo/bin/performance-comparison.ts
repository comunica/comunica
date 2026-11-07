#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { renderComparisonComment } from '../lib/performanceComparison';

// Usage: performance-comparison <head ghbench JSON> <base ghbench JSON> <head sha> <base sha> <CI run URL>
//   [<head ingestion JSON> <base ingestion JSON>]
const [ headFile, baseFile, headSha, baseSha, runUrl, headIngestionFile, baseIngestionFile ] = process.argv.slice(2);
process.stdout.write(renderComparisonComment(
  JSON.parse(readFileSync(headFile, 'utf8')),
  JSON.parse(readFileSync(baseFile, 'utf8')),
  { headSha, baseSha, runUrl },
  headIngestionFile && baseIngestionFile ?
      {
        head: JSON.parse(readFileSync(headIngestionFile, 'utf8')),
        base: JSON.parse(readFileSync(baseIngestionFile, 'utf8')),
      } :
    undefined,
));
