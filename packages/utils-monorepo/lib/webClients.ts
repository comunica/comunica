// eslint-disable-next-line import/no-nodejs-modules
import { spawnSync } from 'node:child_process';

// eslint-disable-next-line import/no-nodejs-modules
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

// eslint-disable-next-line import/no-nodejs-modules
import { tmpdir } from 'node:os';

// eslint-disable-next-line import/no-nodejs-modules
import * as Path from 'node:path';
import semver from 'semver';

/**
 * A web client, as declared in the web-clients/web-clients.json manifest of a monorepo.
 */
export interface IWebClient {
  /**
   * The unique id of the web client, which is also its directory name.
   */
  id: string;
  label: string;
  description: string;
  /**
   * The path of the Comunica config, relative to the monorepo.
   */
  config: string;
  /**
   * If the web client is also built for releases, and not only for development branches.
   */
  release?: boolean;
  /**
   * Settings that are merged into the default settings of the web client generator.
   */
  settings?: Record<string, unknown>;
  /**
   * The path of a directory with queries, relative to the monorepo, to replace the default queries of the generator.
   */
  queries?: string;
}

export interface IWebClientsManifest {
  /**
   * The URL at which the web clients are deployed, ending with a slash.
   */
  baseUrl: string;
  /**
   * The URL of the repository that the web clients are built from.
   */
  repositoryUrl: string;
  clients: IWebClient[];
}

/**
 * What a build is for, as determined by its git ref.
 */
export interface IWebClientsTarget {
  /**
   * The name of the branch or tag, such as 'master', 'next/major' or 'v5.4.1'.
   */
  name: string;
  /**
   * The directory of the deployment, such as 'master', 'next-major' or 'v5.4'.
   */
  directory: string;
  sha: string;
  /**
   * If the build is for a release tag.
   */
  release: boolean;
}

/**
 * A deployed directory of web clients, which is stored as its manifest.json.
 */
export interface IWebClientsDirectory extends IWebClientsTarget {
  /**
   * The URL of the release or commit that the web clients were built from.
   */
  sourceUrl: string;
  date: string;
  clients: Pick<IWebClient, 'id' | 'label' | 'description'>[];
}

/**
 * Determine what a build is for.
 * Releases are built in a directory of their major and minor version,
 * so that a patch release replaces the previous release of that minor version.
 * @param ref A git ref, such as 'refs/heads/master' or 'refs/tags/v5.4.1'.
 * @param sha The commit of the build.
 */
export function getTarget(ref: string, sha: string): IWebClientsTarget {
  const name = ref.replace(/^refs\/(?:heads|tags)\//u, '').replace(/^refs\//u, '');
  const version = ref.startsWith('refs/tags/') ? semver.parse(name) : null;
  return {
    name,
    directory: version ? `v${version.major}.${version.minor}` : name.replaceAll(/[^\w.-]+/gu, '-'),
    sha,
    release: version !== null,
  };
}

/**
 * Read and validate the web clients manifest of a monorepo.
 * @param monorepoPath The path to the monorepo.
 */
export function readManifest(monorepoPath: string): IWebClientsManifest {
  const manifestPath = Path.join(monorepoPath, 'web-clients', 'web-clients.json');
  const manifest: IWebClientsManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!manifest.baseUrl.endsWith('/')) {
    throw new Error(`The baseUrl in ${manifestPath} must end with a slash`);
  }
  const ids = new Set<string>();
  for (const client of manifest.clients) {
    if (!/^[\w.-]+$/u.test(client.id) || ids.has(client.id)) {
      throw new Error(`The web client id ${client.id} in ${manifestPath} is invalid or not unique`);
    }
    ids.add(client.id);
  }
  return manifest;
}

/**
 * Select the web clients to build.
 * @param manifest The web clients manifest.
 * @param target What the build is for. Releases only include the web clients that are marked for releases.
 * @param ids The ids of the web clients to build, or an empty array for all of them.
 */
export function selectWebClients(
  manifest: IWebClientsManifest,
  target: IWebClientsTarget,
  ids: string[],
): IWebClient[] {
  for (const id of ids) {
    if (!manifest.clients.some(client => client.id === id)) {
      throw new Error(`Unknown web client ${id}`);
    }
  }
  const clients = manifest.clients
    .filter(client => (ids.length === 0 || ids.includes(client.id)) && (!target.release || client.release));
  if (clients.length === 0) {
    throw new Error(`No web clients to build for ${target.name}`);
  }
  return clients;
}

/**
 * Determine the URL at which a web client is deployed.
 * @param manifest The web clients manifest.
 * @param target What the build is for.
 * @param client The web client.
 */
export function getWebClientUrl(manifest: IWebClientsManifest, target: IWebClientsTarget, client: IWebClient): string {
  return `${manifest.baseUrl}${target.directory}/${client.id}/`;
}

/**
 * Determine the URL of the release or commit that a build is for.
 * @param manifest The web clients manifest.
 * @param target What the build is for.
 */
export function getSourceUrl(manifest: IWebClientsManifest, target: IWebClientsTarget): string {
  return target.release ?
    `${manifest.repositoryUrl}/releases/tag/${target.name}` :
    `${manifest.repositoryUrl}/commit/${target.sha}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge settings, where objects are merged, and other values of the overlay replace those of the base.
 * @param base The base settings.
 * @param overlay The settings that take precedence.
 */
export function mergeSettings(base: unknown, overlay: unknown): unknown {
  if (isObject(base) && isObject(overlay)) {
    const merged = { ...base };
    for (const [ key, value ] of Object.entries(overlay)) {
      merged[key] = mergeSettings(base[key], value);
    }
    return merged;
  }
  return overlay;
}

/**
 * Create the settings of a web client.
 * @param defaults The default settings of the web client generator.
 * @param manifest The web clients manifest.
 * @param target What the build is for.
 * @param client The web client.
 * @param clients All web clients of the build.
 */
export function createSettings(
  defaults: Record<string, any>,
  manifest: IWebClientsManifest,
  target: IWebClientsTarget,
  client: IWebClient,
  clients: IWebClient[],
): Record<string, any> {
  const settings = <Record<string, any>> mergeSettings(defaults, client.settings ?? {});
  const version = target.release ? target.name : `${target.name} @ ${target.sha.slice(0, 7)}`;
  settings.branding = {
    ...settings.branding,
    subtitle: `Comunica ${version}, ${client.label} config`,
    subtitle_href: getSourceUrl(manifest, target),
    page_title: `Comunica ${version} (${client.label})`,
  };
  // The web client selects each engine of which the URL is a prefix of its own URL, so the last match wins.
  // Therefore, the index comes first, so that the web client itself is selected instead.
  settings.alternativeEngines = {
    'All versions': manifest.baseUrl,
    ...Object.fromEntries(clients
      .map(other => [ `${other.label} (${target.name})`, getWebClientUrl(manifest, target, other) ])),
    ...settings.alternativeEngines,
  };
  return settings;
}

const STYLE = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif;
      max-width: 50rem; margin: 2rem auto; padding: 0 1rem; color: #222; line-height: 1.5; }
    a { color: #740008; text-decoration: none; }
    a:hover, a:focus { text-decoration: underline; }
    h3 { margin-bottom: 0; }
    .meta { margin-top: 0; color: #666; }`;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderPage(title: string, body: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>${escapeHtml(title)}</title>
  <style>${STYLE}
  </style>
</head>
<body>
${body.join('\n')}
</body>
</html>
`;
}

/**
 * The title of a deployed directory, which is its branch, or its minor version for releases.
 * @param directory The deployed directory.
 */
function getTitle(directory: IWebClientsDirectory): string {
  return directory.release ? directory.directory : directory.name;
}

function renderDirectory(directory: IWebClientsDirectory, heading: string, prefix: string): string[] {
  const source = directory.release ? escapeHtml(directory.name) : `<code>${directory.sha.slice(0, 7)}</code>`;
  return [
    `<${heading}>${escapeHtml(getTitle(directory))}</${heading}>`,
    `<p class="meta">Built on ${directory.date.slice(0, 10)} from <a href="${escapeHtml(directory.sourceUrl)}">${source}</a></p>`,
    '<ul>',
    ...directory.clients.map(client =>
      `  <li><a href="${prefix}${client.id}/">${escapeHtml(client.label)}</a>: ${escapeHtml(client.description)}</li>`),
    '</ul>',
  ];
}

/**
 * Render the index page of a deployed directory.
 * @param directory The deployed directory.
 */
export function renderDirectoryIndex(directory: IWebClientsDirectory): string {
  return renderPage(`Comunica ${getTitle(directory)} web clients`, [
    ...renderDirectory(directory, 'h1', './'),
    '<p><a href="../">All versions</a></p>',
  ]);
}

/**
 * Order deployed directories by showing the development branches first, starting with master,
 * followed by the releases, starting with the latest one.
 * @param directories The deployed directories.
 */
export function sortDirectories(directories: IWebClientsDirectory[]): IWebClientsDirectory[] {
  const branches = directories
    .filter(directory => !directory.release)
    .sort((left, right) => Number(right.name === 'master') - Number(left.name === 'master') ||
      left.name.localeCompare(right.name));
  const releases = directories
    .filter(directory => directory.release)
    .sort((left, right) => semver.rcompare(left.name, right.name));
  return [ ...branches, ...releases ];
}

/**
 * Render the index page of all deployed directories.
 * @param manifest The web clients manifest.
 * @param directories The deployed directories, in the order in which they must be shown.
 */
export function renderSiteIndex(manifest: IWebClientsManifest, directories: IWebClientsDirectory[]): string {
  const sections: [string, IWebClientsDirectory[]][] = [
    [ 'Development branches', directories.filter(directory => !directory.release) ],
    [ 'Releases', directories.filter(directory => directory.release) ],
  ];
  return renderPage('Comunica web clients', [
    '<h1>Comunica web clients</h1>',
    `<p>Web clients of <a href="${escapeHtml(manifest.repositoryUrl)}">Comunica</a>, ` +
    'built on every commit of its development branches, and for every release.</p>',
    ...sections
      .filter(([ , entries ]) => entries.length > 0)
      .flatMap(([ title, entries ]) => [
        `<h2>${title}</h2>`,
        ...entries.flatMap(directory => renderDirectory(directory, 'h3', `./${directory.directory}/`)),
      ]),
  ]);
}

/**
 * Build the web clients of a monorepo with the web client generator,
 * into a directory named after the branch or tag of the build.
 * @param monorepoPath The path to the monorepo.
 * @param outputPath The directory in which the directory of the build is created.
 * @param ref The git ref of the build, such as 'refs/heads/master' or 'refs/tags/v5.4.1'.
 * @param sha The commit of the build.
 * @param ids The ids of the web clients to build, or an empty array for all of them.
 * @param date The date of the build.
 */
export function buildWebClients(
  monorepoPath: string,
  outputPath: string,
  ref: string,
  sha: string,
  ids: string[] = [],
  date: Date = new Date(),
): IWebClientsDirectory {
  monorepoPath = Path.resolve(monorepoPath);
  const webClientsPath = Path.join(monorepoPath, 'web-clients');
  const generatorPath = Path.join(webClientsPath, 'node_modules', '@comunica', 'web-client-generator');
  const manifest = readManifest(monorepoPath);
  const target = getTarget(ref, sha);
  const clients = selectWebClients(manifest, target, ids);
  const defaults = JSON.parse(readFileSync(Path.join(generatorPath, 'settings.json'), 'utf8'));
  const directoryPath = Path.resolve(outputPath, target.directory);
  const settingsPath = mkdtempSync(Path.join(tmpdir(), 'web-clients-'));

  try {
    for (const client of clients) {
      const clientSettingsPath = Path.join(settingsPath, `${client.id}.json`);
      writeFileSync(clientSettingsPath, JSON.stringify(createSettings(defaults, manifest, target, client, clients)));
      const clientPath = Path.join(directoryPath, client.id);
      rmSync(clientPath, { recursive: true, force: true });

      // The generator runs from the monorepo, so that the config and engine resolve to its packages.
      const result = spawnSync(process.execPath, [
        Path.join(generatorPath, 'bin', 'generate.js'),
        Path.resolve(monorepoPath, client.config),
        '-c',
        monorepoPath,
        '-d',
        clientPath,
        '-s',
        clientSettingsPath,
        '-w',
        Path.join(webClientsPath, 'webpack.config.js'),
        '-b',
        getWebClientUrl(manifest, target, client),
        ...client.queries ? [ '-q', Path.resolve(monorepoPath, client.queries) ] : [],
      ], {
        cwd: monorepoPath,
        stdio: 'inherit',
        // Source maps are omitted for releases, as they make up most of the size of a web client.
        env: { ...process.env, WEB_CLIENT_SOURCE_MAPS: String(!target.release) },
      });
      if (result.status !== 0) {
        throw new Error(`Building web client ${client.id} failed with exit code ${result.status}`);
      }
    }
  } finally {
    rmSync(settingsPath, { recursive: true, force: true });
    // The generator leaves these behind in its working directory
    rmSync(Path.join(monorepoPath, 'queries.json'), { force: true });
    rmSync(Path.join(monorepoPath, '.tmp-comunica-engine.js'), { force: true });
  }

  const directory: IWebClientsDirectory = {
    ...target,
    sourceUrl: getSourceUrl(manifest, target),
    date: date.toISOString(),
    clients: clients.map(({ id, label, description }) => ({ id, label, description })),
  };
  mkdirSync(directoryPath, { recursive: true });
  writeFileSync(Path.join(directoryPath, 'manifest.json'), `${JSON.stringify(directory, null, 2)}\n`);
  writeFileSync(Path.join(directoryPath, 'index.html'), renderDirectoryIndex(directory));
  return directory;
}

/**
 * (Re)generate the index page of a site of deployed web clients,
 * from the manifest.json files of its directories.
 * @param monorepoPath The path to the monorepo.
 * @param sitePath The path to the site.
 */
export function indexWebClients(monorepoPath: string, sitePath: string): IWebClientsDirectory[] {
  const manifest = readManifest(monorepoPath);
  const directories = sortDirectories(readdirSync(sitePath, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(Path.join(sitePath, entry.name, 'manifest.json')))
    .map(entry => JSON.parse(readFileSync(Path.join(sitePath, entry.name, 'manifest.json'), 'utf8'))));
  writeFileSync(Path.join(sitePath, 'index.html'), renderSiteIndex(manifest, directories));
  return directories;
}

export interface IWebClientsSiteUpdate {
  built: IWebClientsDirectory;
  /**
   * If the built directory replaced the deployed one.
   */
  replaced: boolean;
}

/**
 * Replace the directory that was built with buildWebClients in a site of deployed web clients,
 * and regenerate the index page of the site.
 * A release directory is kept if it contains a newer release already, such as when the build of an older tag is re-run.
 * @param monorepoPath The path to the monorepo.
 * @param buildPath The output directory of buildWebClients, which must contain a single built directory.
 * @param sitePath The path to the site.
 */
export function updateSite(monorepoPath: string, buildPath: string, sitePath: string): IWebClientsSiteUpdate {
  const entries = readdirSync(buildPath, { withFileTypes: true }).filter(entry => entry.isDirectory());
  if (entries.length !== 1) {
    throw new Error(`Expected a single built directory in ${buildPath}`);
  }
  const name = entries[0].name;
  const built: IWebClientsDirectory = JSON.parse(readFileSync(Path.join(buildPath, name, 'manifest.json'), 'utf8'));
  const deployedPath = Path.join(sitePath, name, 'manifest.json');
  const deployed: IWebClientsDirectory | undefined = existsSync(deployedPath) ?
    JSON.parse(readFileSync(deployedPath, 'utf8')) :
    undefined;
  const replaced = !(built.release && deployed?.release && semver.gt(deployed.name, built.name));
  if (replaced) {
    rmSync(Path.join(sitePath, name), { recursive: true, force: true });
    cpSync(Path.join(buildPath, name), Path.join(sitePath, name), { recursive: true });
  }
  indexWebClients(monorepoPath, sitePath);
  return { built, replaced };
}
