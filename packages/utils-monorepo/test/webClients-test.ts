import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as Path from 'node:path';
import type { IWebClient, IWebClientsDirectory, IWebClientsManifest } from '../lib/webClients';
import {
  buildWebClients,
  createSettings,
  getSourceUrl,
  getTarget,
  getWebClientUrl,
  indexWebClients,
  mergeSettings,
  readManifest,
  renderDirectoryIndex,
  renderSiteIndex,
  selectWebClients,
  sortDirectories,
} from '../lib/webClients';

jest.mock<typeof import('node:child_process')>('node:child_process', () => <any> ({
  spawnSync: jest.fn(),
}));

const SHA = '0123456789abcdef0123456789abcdef01234567';

const DEFAULT: IWebClient = {
  id: 'default',
  label: 'Default',
  description: 'The default config.',
  config: 'engines/query-sparql/config/config-default.json',
  release: true,
};

const OTHER: IWebClient = {
  id: 'other',
  label: 'Other',
  description: 'Another config.',
  config: 'engines/query-sparql/config/config-other.json',
  settings: { context: { lenient: true }},
  queries: 'web-clients/queries',
};

const MANIFEST: IWebClientsManifest = {
  baseUrl: 'https://example.org/web-clients/',
  repositoryUrl: 'https://github.com/example/repo',
  clients: [ DEFAULT, OTHER ],
};

const MASTER = getTarget('refs/heads/master', SHA);
const RELEASE = getTarget('refs/tags/v5.4.1', SHA);

function directory(name: string, release: boolean, clients = [ DEFAULT ]): IWebClientsDirectory {
  return {
    name,
    directory: name.replaceAll('/', '-'),
    sha: SHA,
    release,
    sourceUrl: `https://github.com/example/repo/${name}`,
    date: '2026-11-21T10:00:00.000Z',
    clients: clients.map(({ id, label, description }) => ({ id, label, description })),
  };
}

describe('getTarget', () => {
  it('handles the master branch', () => {
    expect(getTarget('refs/heads/master', SHA))
      .toEqual({ name: 'master', directory: 'master', sha: SHA, release: false });
  });

  it('handles branches with slashes', () => {
    expect(getTarget('refs/heads/next/major', SHA))
      .toEqual({ name: 'next/major', directory: 'next-major', sha: SHA, release: false });
  });

  it('handles release tags', () => {
    expect(getTarget('refs/tags/v5.4.1', SHA))
      .toEqual({ name: 'v5.4.1', directory: 'v5.4.1', sha: SHA, release: true });
    expect(getTarget('refs/tags/v6.0.0-alpha.1', SHA).release).toBe(true);
  });

  it('handles tags that are not releases', () => {
    expect(getTarget('refs/tags/experiment', SHA))
      .toEqual({ name: 'experiment', directory: 'experiment', sha: SHA, release: false });
  });

  it('handles other refs', () => {
    expect(getTarget('refs/pull/2022/merge', SHA))
      .toEqual({ name: 'pull/2022/merge', directory: 'pull-2022-merge', sha: SHA, release: false });
    expect(getTarget('refs/heads/feature/a b+c', SHA).directory).toBe('feature-a-b-c');
  });
});

describe('readManifest', () => {
  let monorepo: string;

  beforeEach(() => {
    monorepo = mkdtempSync(Path.join(tmpdir(), 'web-clients-'));
    mkdirSync(Path.join(monorepo, 'web-clients'));
  });

  afterEach(() => {
    rmSync(monorepo, { recursive: true, force: true });
  });

  function writeManifest(manifest: unknown): void {
    writeFileSync(Path.join(monorepo, 'web-clients', 'web-clients.json'), JSON.stringify(manifest));
  }

  it('reads a valid manifest', () => {
    writeManifest(MANIFEST);
    expect(readManifest(monorepo)).toEqual(MANIFEST);
  });

  it('throws on a base URL without trailing slash', () => {
    writeManifest({ ...MANIFEST, baseUrl: 'https://example.org/web-clients' });
    expect(() => readManifest(monorepo)).toThrow('must end with a slash');
  });

  it('throws on duplicate ids', () => {
    writeManifest({ ...MANIFEST, clients: [ DEFAULT, DEFAULT ]});
    expect(() => readManifest(monorepo)).toThrow('The web client id default in');
  });

  it('throws on ids that are no valid directory names', () => {
    writeManifest({ ...MANIFEST, clients: [{ ...DEFAULT, id: '../default' }]});
    expect(() => readManifest(monorepo)).toThrow('The web client id ../default in');
  });
});

describe('selectWebClients', () => {
  it('selects all web clients of branches', () => {
    expect(selectWebClients(MANIFEST, MASTER, [])).toEqual([ DEFAULT, OTHER ]);
  });

  it('selects the web clients of releases', () => {
    expect(selectWebClients(MANIFEST, RELEASE, [])).toEqual([ DEFAULT ]);
  });

  it('selects the given web clients', () => {
    expect(selectWebClients(MANIFEST, MASTER, [ 'other' ])).toEqual([ OTHER ]);
  });

  it('throws on unknown web clients', () => {
    expect(() => selectWebClients(MANIFEST, MASTER, [ 'unknown' ])).toThrow('Unknown web client unknown');
  });

  it('throws if no web clients remain', () => {
    expect(() => selectWebClients(MANIFEST, RELEASE, [ 'other' ])).toThrow('No web clients to build for v5.4.1');
  });
});

describe('getWebClientUrl', () => {
  it('returns the URL of a web client', () => {
    expect(getWebClientUrl(MANIFEST, RELEASE, DEFAULT)).toBe('https://example.org/web-clients/v5.4.1/default/');
  });
});

describe('getSourceUrl', () => {
  it('returns the commit of branches', () => {
    expect(getSourceUrl(MANIFEST, MASTER)).toBe(`https://github.com/example/repo/commit/${SHA}`);
  });

  it('returns the release of release tags', () => {
    expect(getSourceUrl(MANIFEST, RELEASE)).toBe('https://github.com/example/repo/releases/tag/v5.4.1');
  });
});

describe('mergeSettings', () => {
  it('merges objects recursively', () => {
    expect(mergeSettings(
      { a: 1, b: { c: 2, d: [ 1, 2 ]}, e: 'e' },
      { b: { c: 3, d: [ 3 ], f: 4 }, e: { g: 5 }},
    )).toEqual({ a: 1, b: { c: 3, d: [ 3 ], f: 4 }, e: { g: 5 }});
  });

  it('replaces values that are no objects', () => {
    expect(mergeSettings([ 1 ], { a: 1 })).toEqual({ a: 1 });
    expect(mergeSettings({ a: 1 }, 'b')).toBe('b');
  });
});

describe('createSettings', () => {
  const defaults = {
    branding: { title: 'Title', subtitle: 'Subtitle' },
    context: { lenient: false, other: true },
    alternativeEngines: { Released: 'https://example.org/released/' },
  };

  it('creates the settings of a branch', () => {
    expect(createSettings(defaults, MANIFEST, MASTER, DEFAULT, [ DEFAULT, OTHER ])).toEqual({
      branding: {
        title: 'Title',
        subtitle: 'Comunica master @ 0123456, Default config',
        subtitle_href: `https://github.com/example/repo/commit/${SHA}`,
        page_title: 'Comunica master @ 0123456 (Default)',
      },
      context: { lenient: false, other: true },
      alternativeEngines: {
        'All versions': 'https://example.org/web-clients/',
        'Default (master)': 'https://example.org/web-clients/master/default/',
        'Other (master)': 'https://example.org/web-clients/master/other/',
        Released: 'https://example.org/released/',
      },
    });
  });

  it('creates the settings of a release, with the settings of the web client', () => {
    expect(createSettings({}, MANIFEST, RELEASE, OTHER, [ OTHER ])).toEqual({
      branding: {
        subtitle: 'Comunica v5.4.1, Other config',
        subtitle_href: 'https://github.com/example/repo/releases/tag/v5.4.1',
        page_title: 'Comunica v5.4.1 (Other)',
      },
      context: { lenient: true },
      alternativeEngines: {
        'All versions': 'https://example.org/web-clients/',
        'Other (v5.4.1)': 'https://example.org/web-clients/v5.4.1/other/',
      },
    });
  });

  it('lists the index first, so that the web client itself is selected', () => {
    const engines = Object.keys(createSettings(defaults, MANIFEST, MASTER, OTHER, [ DEFAULT, OTHER ])
      .alternativeEngines);
    expect(engines[0]).toBe('All versions');
  });
});

describe('sortDirectories', () => {
  it('orders master, other branches, and releases from new to old', () => {
    expect(sortDirectories([
      directory('v5.10.0', true),
      directory('next/major', false),
      directory('v5.2.0', true),
      directory('master', false),
      directory('feature/a', false),
      directory('v6.0.0', true),
    ]).map(entry => entry.name)).toEqual([ 'master', 'feature/a', 'next/major', 'v6.0.0', 'v5.10.0', 'v5.2.0' ]);
  });
});

describe('renderDirectoryIndex', () => {
  it('renders the web clients of a branch', () => {
    const html = renderDirectoryIndex(directory('master', false, [ DEFAULT, OTHER ]));
    expect(html).toContain('<title>Comunica master web clients</title>');
    expect(html).toContain('<h1>master</h1>');
    expect(html).toContain('Built on 2026-11-21 from <a href="https://github.com/example/repo/master"><code>0123456</code></a>');
    expect(html).toContain('<li><a href="./default/">Default</a>: The default config.</li>');
    expect(html).toContain('<li><a href="./other/">Other</a>: Another config.</li>');
    expect(html).toContain('<a href="../">All versions</a>');
  });

  it('renders the web clients of a release', () => {
    expect(renderDirectoryIndex(directory('v5.4.1', true)))
      .toContain('Built on 2026-11-21 from <a href="https://github.com/example/repo/v5.4.1">v5.4.1</a>');
  });

  it('escapes HTML', () => {
    const html = renderDirectoryIndex(directory('master', false, [{ ...DEFAULT, label: '<b>"A" & B</b>' }]));
    expect(html).toContain('>&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;</a>');
  });
});

describe('renderSiteIndex', () => {
  it('renders branches and releases', () => {
    const html = renderSiteIndex(MANIFEST, [ directory('next/major', false), directory('v5.4.1', true) ]);
    expect(html).toContain('<a href="https://github.com/example/repo">Comunica</a>');
    expect(html).toContain('<h2>Development branches</h2>\n<h3>next/major</h3>');
    expect(html).toContain('<a href="./next-major/default/">Default</a>');
    expect(html).toContain('<h2>Releases</h2>\n<h3>v5.4.1</h3>');
    expect(html).toContain('<a href="./v5.4.1/default/">Default</a>');
  });

  it('omits sections without directories', () => {
    const html = renderSiteIndex(MANIFEST, [ directory('master', false) ]);
    expect(html).toContain('<h2>Development branches</h2>');
    expect(html).not.toContain('<h2>Releases</h2>');
  });
});

describe('with a monorepo', () => {
  let monorepo: string;
  let output: string;

  beforeEach(() => {
    monorepo = mkdtempSync(Path.join(tmpdir(), 'web-clients-'));
    output = Path.join(monorepo, 'web-clients', 'build');
    const generator = Path.join(monorepo, 'web-clients', 'node_modules', '@comunica', 'web-client-generator');
    mkdirSync(generator, { recursive: true });
    writeFileSync(Path.join(monorepo, 'web-clients', 'web-clients.json'), JSON.stringify(MANIFEST));
    writeFileSync(Path.join(generator, 'settings.json'), JSON.stringify({ branding: { title: 'Title' }}));
    jest.mocked(spawnSync).mockReset();
    jest.mocked(spawnSync).mockImplementation(<any> ((command: string, args: string[], options: any) => {
      // Like the generator, which leaves these behind
      writeFileSync(Path.join(options.cwd, 'queries.json'), '{}');
      writeFileSync(Path.join(options.cwd, '.tmp-comunica-engine.js'), '');
      mkdirSync(args[args.indexOf('-d') + 1], { recursive: true });
      return { status: 0 };
    }));
  });

  afterEach(() => {
    rmSync(monorepo, { recursive: true, force: true });
  });

  describe('buildWebClients', () => {
    it('builds all web clients of a branch', () => {
      const date = new Date('2026-11-21T10:00:00.000Z');
      const result = buildWebClients(monorepo, output, 'refs/heads/next/major', SHA, [], date);

      const generator = Path.join(monorepo, 'web-clients', 'node_modules', '@comunica', 'web-client-generator');
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenNthCalledWith(1, process.execPath, [
        Path.join(generator, 'bin', 'generate.js'),
        Path.join(monorepo, DEFAULT.config),
        '-c',
        monorepo,
        '-d',
        Path.join(output, 'next-major', 'default'),
        '-s',
        expect.stringMatching(/default\.json$/u),
        '-w',
        Path.join(monorepo, 'web-clients', 'webpack.config.js'),
        '-b',
        'https://example.org/web-clients/next-major/default/',
      ], expect.objectContaining({
        cwd: monorepo,
        stdio: 'inherit',
        env: expect.objectContaining({ WEB_CLIENT_SOURCE_MAPS: 'true' }),
      }));
      expect(jest.mocked(spawnSync).mock.calls[1][1]).toEqual(expect.arrayContaining([
        '-q',
        Path.join(monorepo, 'web-clients', 'queries'),
      ]));

      const expected = {
        ...directory('next/major', false, [ DEFAULT, OTHER ]),
        sourceUrl: getSourceUrl(MANIFEST, getTarget('refs/heads/next/major', SHA)),
      };
      expect(result).toEqual(expected);
      expect(JSON.parse(readFileSync(Path.join(output, 'next-major', 'manifest.json'), 'utf8'))).toEqual(expected);
      expect(readFileSync(Path.join(output, 'next-major', 'index.html'), 'utf8')).toBe(renderDirectoryIndex(expected));
      expect(existsSync(Path.join(monorepo, 'queries.json'))).toBe(false);
      expect(existsSync(Path.join(monorepo, '.tmp-comunica-engine.js'))).toBe(false);
    });

    it('passes the settings of each web client to the generator', () => {
      const settings: Record<string, any>[] = [];
      jest.mocked(spawnSync).mockImplementation(<any> ((command: string, args: string[]) => {
        settings.push(JSON.parse(readFileSync(args[args.indexOf('-s') + 1], 'utf8')));
        return { status: 0 };
      }));
      buildWebClients(monorepo, output, 'refs/heads/master', SHA);
      expect(settings).toEqual([
        createSettings({ branding: { title: 'Title' }}, MANIFEST, MASTER, DEFAULT, [ DEFAULT, OTHER ]),
        createSettings({ branding: { title: 'Title' }}, MANIFEST, MASTER, OTHER, [ DEFAULT, OTHER ]),
      ]);
    });

    it('builds the web clients of a release without source maps', () => {
      const result = buildWebClients(monorepo, output, 'refs/tags/v5.4.1', SHA);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).toHaveBeenCalledWith(process.execPath, expect.anything(), expect.objectContaining({
        env: expect.objectContaining({ WEB_CLIENT_SOURCE_MAPS: 'false' }),
      }));
      expect(result.clients).toEqual([{ id: 'default', label: 'Default', description: 'The default config.' }]);
      expect(existsSync(Path.join(output, 'v5.4.1', 'manifest.json'))).toBe(true);
    });

    it('replaces previous builds of a web client', () => {
      mkdirSync(Path.join(output, 'master', 'other'), { recursive: true });
      writeFileSync(Path.join(output, 'master', 'other', 'stale.js'), '');
      mkdirSync(Path.join(output, 'master', 'default'), { recursive: true });
      writeFileSync(Path.join(output, 'master', 'default', 'stale.js'), '');
      buildWebClients(monorepo, output, 'refs/heads/master', SHA, [ 'default' ]);
      expect(existsSync(Path.join(output, 'master', 'default', 'stale.js'))).toBe(false);
      expect(existsSync(Path.join(output, 'master', 'other', 'stale.js'))).toBe(true);
    });

    it('throws and cleans up if the generator fails', () => {
      jest.mocked(spawnSync).mockImplementation(<any> ((command: string, args: string[], options: any) => {
        writeFileSync(Path.join(options.cwd, '.tmp-comunica-engine.js'), '');
        return { status: 1 };
      }));
      expect(() => buildWebClients(monorepo, output, 'refs/heads/master', SHA))
        .toThrow('Building web client default failed with exit code 1');
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(existsSync(Path.join(monorepo, '.tmp-comunica-engine.js'))).toBe(false);
      expect(existsSync(Path.join(output, 'master', 'manifest.json'))).toBe(false);
    });
  });

  describe('indexWebClients', () => {
    it('indexes the deployed directories', () => {
      const site = Path.join(monorepo, 'site');
      for (const entry of [ directory('v5.4.1', true), directory('master', false) ]) {
        mkdirSync(Path.join(site, entry.directory), { recursive: true });
        writeFileSync(Path.join(site, entry.directory, 'manifest.json'), JSON.stringify(entry));
      }
      mkdirSync(Path.join(site, '.git'));
      writeFileSync(Path.join(site, '.nojekyll'), '');

      const result = indexWebClients(monorepo, site);
      expect(result.map(entry => entry.name)).toEqual([ 'master', 'v5.4.1' ]);
      expect(readFileSync(Path.join(site, 'index.html'), 'utf8')).toBe(renderSiteIndex(MANIFEST, result));
    });
  });
});
