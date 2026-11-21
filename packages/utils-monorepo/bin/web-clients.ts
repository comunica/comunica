#!/usr/bin/env node

import { buildWebClients, indexWebClients, updateSite } from '../lib/webClients';

const USAGE = `Usage:
  web-clients build <monorepo dir> <output dir> [<web client id>...]
  web-clients update <monorepo dir> <output dir> <site dir>
  web-clients index <monorepo dir> <site dir>

The build command builds for the git ref and commit in the GITHUB_REF and GITHUB_SHA environment variables.
The update command replaces the built directory in a site, unless it contains a newer release, and indexes the site.
`;

const [ command, ...args ] = process.argv.slice(2);
const ref = process.env.GITHUB_REF;
const sha = process.env.GITHUB_SHA;
if (command === 'build' && args.length >= 2 && ref && sha) {
  const [ monorepoPath, outputPath, ...ids ] = args;
  const directory = buildWebClients(monorepoPath, outputPath, ref, sha, ids);
  process.stdout.write(`Built ${directory.clients.map(client => client.id).join(', ')} in ${directory.directory}\n`);
} else if (command === 'update' && args.length === 3) {
  const { built, replaced } = updateSite(args[0], args[1], args[2]);
  process.stdout.write(replaced ?
    `Placed ${built.name} in ${built.directory}/\n` :
    `Kept ${built.directory}/, as it contains a newer release than ${built.name}\n`);
} else if (command === 'index' && args.length === 2) {
  const directories = indexWebClients(args[0], args[1]);
  process.stdout.write(`Indexed ${directories.map(directory => directory.directory).join(', ')}\n`);
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
