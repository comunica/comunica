#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync, writeFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'node:path';

import { parseQueryTimes, toRequestsEntries } from '../lib/performanceRequests';

// Usage: performance-requests <output file> <comma-separated labels> <results dir>...
// Determines the HTTP requests per query of benchmark suites, from the query-times.csv files in their results.
// Suites without any HTTP requests, such as those over local files, get no entries.
const [ outputFile, labelsList, ...resultsDirs ] = process.argv.slice(2);
const labels = labelsList ? labelsList.split(',') : [];
if (!outputFile || labels.length !== resultsDirs.length) {
  process.stderr.write('Usage: performance-requests <output file> <comma-separated labels> <results dir>...\n');
  process.exitCode = 1;
} else {
  const entries = resultsDirs.flatMap((resultsDir, index) => {
    const suiteEntries = toRequestsEntries(
      labels[index],
      parseQueryTimes(readFileSync(join(resultsDir, 'query-times.csv'), 'utf8')),
    );
    process.stderr.write(`Determined ${suiteEntries.length} HTTP request entries for ${labels[index]}\n`);
    return suiteEntries;
  });
  writeFileSync(outputFile, JSON.stringify(entries, null, '  '), 'utf8');
}
