import { exec } from 'node:child_process';
import { copy, emptyDir, pathExists, readdir, readFile } from 'fs-extra';
import { isSemVerEqual, testConfigCompat } from '../lib/testConfigCompat';

jest.mock<typeof import('node:child_process')>('node:child_process', () => {
  return <any> {
    exec: jest.fn(),
  };
});

jest.mock<typeof import('fs-extra')>('fs-extra', () => {
  return <any> {
    readdir: jest.fn(),
    pathExists: jest.fn(),
    readFile: jest.fn(),
    emptyDir: jest.fn(),
    copy: jest.fn(),
  };
});

const MONOREPO = '/repo';
const INSTALL_PATH = '/tmp/comunica-test-previous-engines/';
const MODULES = `${INSTALL_PATH}node_modules`;
const CONFIG_PACKAGE = '@comunica/config-query-sparql';
const ENGINE = '@comunica/query-sparql';
const CONFIG_DIR = `${MONOREPO}/engines/config-query-sparql`;
const HOISTED = `${MODULES}/${CONFIG_PACKAGE}`;
const NESTED = `${MODULES}/rdf-parse/node_modules/${CONFIG_PACKAGE}`;

/**
 * A config file, as far as backwards-compatibility is concerned:
 * the config files it imports, and the actors it instantiates.
 */
interface IConfigFile {
  imports?: string[];
  actors?: string[];
}
type ConfigPackage = Record<string, IConfigFile>;
/**
 * The actors that each published engine version declares as a dependency.
 */
type Releases = Record<string, string[]>;

/**
 * The config package in the working tree, which is what the check is validating.
 */
let monorepoConfigs: ConfigPackage;
/**
 * The config package as currently published on npm, which is what gets installed.
 */
let publishedConfigs: ConfigPackage;
/**
 * The config package inside each installed copy, which injection replaces.
 */
let installedConfigs: Record<string, ConfigPackage>;
let releases: Releases;
let installedVersion: string;
let instantiations: { version: string; config: string }[];

let dirs: Record<string, string[]>;
let files: Record<string, string>;

/**
 * Paths are declared with forward slashes, while the code under test builds them with Path.join,
 * which separates with backslashes on Windows.
 */
function normalize(path: string): string {
  return path.replaceAll('\\', '/');
}

function dirent(parentPath: string, entry: string): any {
  const directory = entry.endsWith('/');
  return {
    name: directory ? entry.slice(0, -1) : entry,
    parentPath,
    isDirectory: () => directory,
    isFile: () => !directory,
  };
}

function removeUnder(path: string): void {
  const prefix = path.endsWith('/') ? path.slice(0, -1) : path;
  for (const key of Object.keys(dirs)) {
    if (key === prefix || key.startsWith(`${prefix}/`)) {
      delete dirs[key];
    }
  }
  for (const key of Object.keys(files)) {
    if (key.startsWith(`${prefix}/`)) {
      delete files[key];
    }
  }
  for (const key of Object.keys(installedConfigs)) {
    if (key === prefix || key.startsWith(`${prefix}/`)) {
      delete installedConfigs[key];
    }
  }
}

/**
 * Lay out the packages that npm installs for the given engine version.
 * The config package ends up both hoisted and nested below another package,
 * next to a package holding neither and a file that is not a package at all.
 */
function installEngine(version: string): void {
  installedVersion = version;
  dirs[MODULES] = [ '@comunica/', 'rdf-parse/', '.package-lock.json' ];
  dirs[`${MODULES}/@comunica`] = [ 'config-query-sparql/', 'query-sparql/' ];
  dirs[`${MODULES}/@comunica/query-sparql`] = [];
  for (const installed of [ HOISTED, NESTED ]) {
    dirs[installed] = [];
    installedConfigs[installed] = { ...publishedConfigs };
    for (const relative of Object.keys(publishedConfigs)) {
      files[`${installed}/${relative}`] = '{}';
    }
  }
}

function installedCopyOf(path: string): string | undefined {
  return [ HOISTED, NESTED ].find(installed => path.startsWith(`${installed}/`));
}

/**
 * Instantiate an engine on a config file, the way the check asks the installed engine to.
 * This fails exactly when the config needs an actor that the engine version does not depend on,
 * which is what makes a config change backwards-incompatible.
 */
function instantiateEngine(configPath: string): void {
  const installed = installedCopyOf(configPath);
  const entryPackage = installed ? installedConfigs[installed] : monorepoConfigs;
  const entry = configPath.slice(`${installed ?? CONFIG_DIR}/`.length);
  instantiations.push({ version: installedVersion, config: entry });

  // Components.js resolves the imports of a config file through the installed config package,
  // wherever npm happens to have put it, and not through the file the entry was read from
  const importedPackage = installedConfigs[NESTED];
  const required = new Set<string>();
  const visited = new Set<string>();
  const visit = (relative: string, configPackage: ConfigPackage): void => {
    if (visited.has(relative)) {
      return;
    }
    visited.add(relative);
    const config = configPackage[relative];
    if (!config) {
      throw new Error(`Error while parsing file "${configPath}": ${relative} does not exist`);
    }
    for (const actor of config.actors ?? []) {
      required.add(actor);
    }
    for (const imported of config.imports ?? []) {
      visit(imported, importedPackage);
    }
  };
  visit(entry, entryPackage);

  for (const actor of required) {
    if (!releases[installedVersion].includes(actor)) {
      throw new Error(`Error while parsing file "${configPath}": Failed to load remote context ` +
        `https://linkedsoftwaredependencies.org/bundles/npm/@comunica/${actor}/^5.0.0/components/context.jsonld`);
    }
  }
}

/**
 * Declare a monorepo holding one config package and one engine, against a published npm state.
 * @param options A scenario.
 * @param options.configs The config package in the working tree.
 * @param options.published The config package as published on npm.
 * @param options.releases The published engine versions, and the actors each depends on.
 * @param options.engineConfig The config file that the engine in the working tree imports.
 */
function setUpScenario(options: {
  configs: ConfigPackage;
  published: ConfigPackage;
  releases: Releases;
  engineConfig: string;
}): void {
  monorepoConfigs = options.configs;
  publishedConfigs = options.published;
  releases = options.releases;

  dirs[`${MONOREPO}/engines`] = [ 'config-query-sparql/', 'query-sparql/', 'README.md' ];
  dirs[`${CONFIG_DIR}/components`] = [];
  // Only the config files at the root of the config directory are entry points,
  // next to files and directories that are not config files at all
  dirs[`${CONFIG_DIR}/config`] = [
    ...Object.keys(options.configs)
      .filter(relative => /^config\/config-[^/]+$/u.test(relative))
      .map(relative => relative.slice('config/'.length)),
    'README.md',
    'config-9.json',
    'optimize/',
  ];
  files[`${CONFIG_DIR}/package.json`] = JSON.stringify({
    name: CONFIG_PACKAGE,
    files: [ 'components', 'config' ],
  });

  files[`${MONOREPO}/engines/query-sparql/package.json`] = JSON.stringify({
    name: ENGINE,
    files: [ 'engine-default.js' ],
  });
  files[`${MONOREPO}/engines/query-sparql/config/config-default.json`] = JSON.stringify({
    import: [ `ccqs:${options.engineConfig}` ],
  });
}

const ACTORS_UNVERSIONED = 'config/optimize/actors.json';
const ACTORS_V5_1_3 = 'config/optimize/actors-v5-1-3.json';
const ACTORS_V5_3_0 = 'config/optimize/actors-v5-3-0.json';
const CONFIG_UNVERSIONED = 'config/config-default.json';
const CONFIG_V5_1_3 = 'config/config-default-v5-1-3.json';
const CONFIG_V5_3_0 = 'config/config-default-v5-3-0.json';

/**
 * The state of the world before any change: two config generations, four published engines.
 * Engines from 5.2.0 onwards use the v5-1-3 config and depend on its extra actor,
 * while the older ones use the unversioned config.
 */
function releasedState(): { published: ConfigPackage; releases: Releases } {
  return {
    published: {
      [CONFIG_UNVERSIONED]: { imports: [ ACTORS_UNVERSIONED ]},
      [CONFIG_V5_1_3]: { imports: [ ACTORS_V5_1_3 ]},
      [ACTORS_UNVERSIONED]: { actors: [ 'actor-join-bgp' ]},
      [ACTORS_V5_1_3]: { actors: [ 'actor-join-bgp', 'actor-group-sources' ]},
    },
    releases: {
      '5.0.1': [ 'actor-join-bgp' ],
      '5.1.3': [ 'actor-join-bgp' ],
      '5.2.0': [ 'actor-join-bgp', 'actor-group-sources' ],
      '5.3.0': [ 'actor-join-bgp', 'actor-group-sources' ],
    },
  };
}

/**
 * A working tree that matches what is published, which is the state between releases.
 */
function unchangedConfigs(): ConfigPackage {
  return releasedState().published;
}

describe('testConfigCompat', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    dirs = {};
    files = {};
    installedConfigs = {};
    instantiations = [];
    installedVersion = '';

    jest.spyOn(console, 'log').mockImplementation(() => {
      // Keep the test output clean
    });

    jest.mocked(readdir).mockImplementation(<any> (async(path: string) => {
      const entries = dirs[normalize(path)];
      if (!entries) {
        throw new Error(`Virtual readdir of unknown directory ${path}`);
      }
      return entries.map(entry => dirent(normalize(path), entry));
    }));
    jest.mocked(readFile).mockImplementation(<any> (async(path: string) => {
      const contents = files[normalize(path)];
      if (contents === undefined) {
        throw new Error(`Virtual readFile of unknown file ${path}`);
      }
      return contents;
    }));
    jest.mocked(pathExists).mockImplementation(<any> (async(path: string) =>
      normalize(path) in files || normalize(path) in dirs));
    jest.mocked(emptyDir).mockImplementation(<any> (async(path: string) => {
      removeUnder(normalize(path));
    }));
    jest.mocked(copy).mockImplementation(<any> (async(source: string, target: string, options: any) => {
      const to = normalize(target);
      dirs[to] = [];
      // Copying does not remove what is already there, which is why the target is emptied first
      installedConfigs[to] = { ...installedConfigs[to], ...monorepoConfigs };
      // The filter also runs on every directory, and a rejected one takes its whole subtree with it
      const included = (relative: string): boolean => relative.split('/').every((_, index, segments) => {
        const prefix = segments.slice(0, index + 1).join('/');
        return options.filter(`${normalize(source)}/${prefix}`, `${to}/${prefix}`);
      });
      for (const relative of [ ...Object.keys(monorepoConfigs), 'node_modules/nested-package' ]) {
        if (included(relative)) {
          files[`${to}/${relative}`] = '{}';
        }
      }
    }));

    jest.mocked(exec).mockImplementation(<any> ((command: string, options: any, callback: any) => {
      try {
        if (command.startsWith('npm view')) {
          callback(null, { stdout: JSON.stringify(Object.keys(releases)), stderr: '' });
          return;
        }
        if (command.startsWith('npm install')) {
          installEngine(command.slice(`npm install ${ENGINE}@`.length));
          callback(null, { stdout: '', stderr: '' });
          return;
        }
        instantiateEngine(normalize(/configPath: "([^"]*)"/u.exec(command)![1]));
        callback(null, { stdout: '', stderr: '' });
      } catch (error: unknown) {
        callback(error);
      }
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('for a config package that did not change since its release', () => {
    beforeEach(() => {
      setUpScenario({ configs: unchangedConfigs(), ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should accept it', async() => {
      await expect(testConfigCompat(MONOREPO)).resolves.toBeUndefined();
    });

    it('should test each config against the engine versions that use it', async() => {
      await testConfigCompat(MONOREPO);

      expect(instantiations).toEqual([
        { version: '5.2.0', config: CONFIG_V5_1_3 },
        { version: '5.3.0', config: CONFIG_V5_1_3 },
        { version: '5.0.1', config: CONFIG_UNVERSIONED },
        { version: '5.1.3', config: CONFIG_UNVERSIONED },
      ]);
    });

    it('should inject the working tree over every installed copy, without its node_modules', async() => {
      await testConfigCompat(MONOREPO);

      expect(installedConfigs[HOISTED]).toEqual(monorepoConfigs);
      expect(installedConfigs[NESTED]).toEqual(monorepoConfigs);
      expect(files[`${HOISTED}/node_modules/nested-package`]).toBeUndefined();
    });
  });

  describe('when an actor is added to an unversioned config', () => {
    beforeEach(() => {
      // The sort-limit-pushdown regression of 5.4.0: the actor landed in the config that
      // external packages keep resolving to, rather than only in a new versioned copy
      const configs = unchangedConfigs();
      configs[ACTORS_UNVERSIONED] = { actors: [ 'actor-join-bgp', 'actor-sort-limit-pushdown' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should reject, as the engines on that config do not depend on the new actor', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow('@comunica/actor-sort-limit-pushdown/^5.0.0/components/context.jsonld');
    });

    it('should reject on the oldest engine version that uses the config', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow('@comunica/actor-sort-limit-pushdown/^5.0.0/components/context.jsonld');

      expect(instantiations.at(-1)).toEqual({ version: '5.0.1', config: CONFIG_UNVERSIONED });
    });
  });

  describe('when an actor is added to a versioned config that already shipped', () => {
    beforeEach(() => {
      // Editing a config that a newer engine version already pins itself to
      const configs = unchangedConfigs();
      configs[ACTORS_V5_1_3] = { actors: [ 'actor-join-bgp', 'actor-group-sources', 'actor-nodes' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should reject, as the engines pinned to that config do not depend on the new actor', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow('@comunica/actor-nodes/^5.0.0/components/context.jsonld');
    });
  });

  describe('when an actor is added through a new versioned config', () => {
    beforeEach(() => {
      // The documented way to add an actor: a new versioned copy, leaving the older ones alone
      const configs = unchangedConfigs();
      configs[CONFIG_V5_3_0] = { imports: [ ACTORS_V5_3_0 ]};
      configs[ACTORS_V5_3_0] = { actors: [ 'actor-join-bgp', 'actor-group-sources', 'actor-sort-limit-pushdown' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_3_0 });
    });

    it('should accept it', async() => {
      await expect(testConfigCompat(MONOREPO)).resolves.toBeUndefined();
    });

    it('should not test the new config, as no published engine uses it yet', async() => {
      await testConfigCompat(MONOREPO);

      expect(instantiations.map(instantiation => instantiation.config)).not.toContain(CONFIG_V5_3_0);
    });
  });

  describe('when a newer versioned config exists that this engine does not use yet', () => {
    beforeEach(() => {
      // Another engine moved on to the new config, while this one still imports the older one
      const configs = unchangedConfigs();
      configs[CONFIG_V5_3_0] = { imports: [ ACTORS_V5_3_0 ]};
      configs[ACTORS_V5_3_0] = { actors: [ 'actor-join-bgp', 'actor-group-sources', 'actor-sort-limit-pushdown' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should accept it, and skip the config that was not published yet', async() => {
      await expect(testConfigCompat(MONOREPO)).resolves.toBeUndefined();

      expect(instantiations.map(instantiation => instantiation.config)).not.toContain(CONFIG_V5_3_0);
    });
  });

  describe('when the new versioned config and its engine are published', () => {
    beforeEach(() => {
      const { published, releases: published5 } = releasedState();
      published[CONFIG_V5_3_0] = { imports: [ ACTORS_V5_3_0 ]};
      published[ACTORS_V5_3_0] = { actors: [ 'actor-join-bgp', 'actor-group-sources', 'actor-sort-limit-pushdown' ]};
      setUpScenario({
        configs: { ...published },
        published,
        releases: { ...published5, '5.4.0': [ 'actor-join-bgp', 'actor-group-sources', 'actor-sort-limit-pushdown' ]},
        engineConfig: CONFIG_V5_3_0,
      });
    });

    it('should accept it, and test it against the engine that uses it', async() => {
      await expect(testConfigCompat(MONOREPO)).resolves.toBeUndefined();

      expect(instantiations).toContainEqual({ version: '5.4.0', config: CONFIG_V5_3_0 });
    });
  });

  describe('when an engine is published without an actor that its config needs', () => {
    beforeEach(() => {
      const { published, releases: published5 } = releasedState();
      published[CONFIG_V5_3_0] = { imports: [ ACTORS_V5_3_0 ]};
      published[ACTORS_V5_3_0] = { actors: [ 'actor-join-bgp', 'actor-group-sources', 'actor-sort-limit-pushdown' ]};
      setUpScenario({
        configs: { ...published },
        published,
        // The engine shipped without declaring the actor its own config instantiates
        releases: { ...published5, '5.4.0': [ 'actor-join-bgp', 'actor-group-sources' ]},
        engineConfig: CONFIG_V5_3_0,
      });
    });

    it('should reject', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow('@comunica/actor-sort-limit-pushdown/^5.0.0/components/context.jsonld');
    });
  });

  describe('when a config changes without touching which actors it needs', () => {
    beforeEach(() => {
      // Parameters and instantiations may change freely within a major range
      const configs = unchangedConfigs();
      configs[ACTORS_UNVERSIONED] = { actors: [ 'actor-join-bgp', 'actor-join-bgp' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should accept it', async() => {
      await expect(testConfigCompat(MONOREPO)).resolves.toBeUndefined();
    });
  });

  describe('when an imported config file is removed from the working tree', () => {
    beforeEach(() => {
      const configs = unchangedConfigs();
      delete configs[ACTORS_UNVERSIONED];
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should reject, rather than fall back to the published file', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects.toThrow(`${ACTORS_UNVERSIONED} does not exist`);
    });
  });

  describe('when a config imports a file that does not exist', () => {
    beforeEach(() => {
      const configs = unchangedConfigs();
      configs[CONFIG_UNVERSIONED] = { imports: [ 'config/optimize/actors-typo.json' ]};
      setUpScenario({ configs, ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should reject', async() => {
      await expect(testConfigCompat(MONOREPO)).rejects.toThrow('config/optimize/actors-typo.json does not exist');
    });
  });

  describe('for a working tree that cannot be checked', () => {
    it('should reject when the config package has not been built', async() => {
      setUpScenario({ configs: unchangedConfigs(), ...releasedState(), engineConfig: CONFIG_V5_1_3 });
      delete dirs[`${CONFIG_DIR}/components`];

      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow(`Config package '${CONFIG_PACKAGE}' has no built components, run the build first`);
    });

    it('should skip engine versions that do not depend on the config package', async() => {
      setUpScenario({ configs: unchangedConfigs(), ...releasedState(), engineConfig: CONFIG_V5_1_3 });
      const withoutConfigPackage = jest.mocked(exec).getMockImplementation()!;
      jest.mocked(exec).mockImplementation(<any> ((command: string, options: any, callback: any) => {
        withoutConfigPackage(command, options, callback);
        if (command.startsWith('npm install')) {
          delete dirs[HOISTED];
          delete dirs[NESTED];
        }
      }));

      await testConfigCompat(MONOREPO);

      expect(instantiations).toEqual([]);
      expect(copy).not.toHaveBeenCalled();
    });
  });

  describe('for engines that cannot be checked', () => {
    beforeEach(() => {
      setUpScenario({ configs: unchangedConfigs(), ...releasedState(), engineConfig: CONFIG_V5_1_3 });
    });

    it('should skip engines without a default config', async() => {
      delete files[`${MONOREPO}/engines/query-sparql/config/config-default.json`];

      await testConfigCompat(MONOREPO);

      expect(instantiations).toEqual([]);
    });

    it('should skip engines whose default config imports nothing', async() => {
      files[`${MONOREPO}/engines/query-sparql/config/config-default.json`] = JSON.stringify({});

      await testConfigCompat(MONOREPO);

      expect(instantiations).toEqual([]);
    });

    it('should skip engines that import an unversioned config', async() => {
      files[`${MONOREPO}/engines/query-sparql/config/config-default.json`] = JSON.stringify({
        import: [ `ccqs:${CONFIG_UNVERSIONED}` ],
      });

      await testConfigCompat(MONOREPO);

      expect(instantiations).toEqual([]);
    });
  });

  describe('isSemVerEqual', () => {
    it('should hold for identical versions', () => {
      expect(isSemVerEqual({ major: 5, minor: 1, patch: 3 }, { major: 5, minor: 1, patch: 3 })).toBe(true);
    });

    it('should not hold for a different major, minor or patch', () => {
      expect(isSemVerEqual({ major: 5, minor: 1, patch: 3 }, { major: 6, minor: 1, patch: 3 })).toBe(false);
      expect(isSemVerEqual({ major: 5, minor: 1, patch: 3 }, { major: 5, minor: 2, patch: 3 })).toBe(false);
      expect(isSemVerEqual({ major: 5, minor: 1, patch: 3 }, { major: 5, minor: 1, patch: 4 })).toBe(false);
    });
  });
});
