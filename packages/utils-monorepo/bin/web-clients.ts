#!/usr/bin/env node

import { buildWebClients, indexWebClients } from '../lib/webClients';

const USAGE = `Usage:
  web-clients build <monorepo dir> <output dir> [<web client id>...]
  web-clients index <monorepo dir> <site dir>

The build command builds for the git ref and commit in the GITHUB_REF and GITHUB_SHA environment variables.
`;

const [ command, ...args ] = process.argv.slice(2);
const ref = process.env.GITHUB_REF;
const sha = process.env.GITHUB_SHA;
if (command === 'build' && args.length >= 2 && ref && sha) {
  const [ monorepoPath, outputPath, ...ids ] = args;
  const directory = buildWebClients(monorepoPath, outputPath, ref, sha, ids);
  process.stdout.write(`Built ${directory.clients.map(client => client.id).join(', ')} in ${directory.directory}\n`);
} else if (command === 'index' && args.length === 2) {
  const directories = indexWebClients(args[0], args[1]);
  process.stdout.write(`Indexed ${directories.map(directory => directory.directory).join(', ')}\n`);
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
