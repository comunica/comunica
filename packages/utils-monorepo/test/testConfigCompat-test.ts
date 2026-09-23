import { exec } from 'node:child_process';
import * as Path from 'node:path';
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
const MODULES = Path.join(INSTALL_PATH, 'node_modules');
const CONFIG_PACKAGE = '@comunica/config-query-sparql';
const ENGINE = '@comunica/query-sparql';
const CONFIG_DIR = `${MONOREPO}/engines/config-query-sparql`;
const HOISTED = Path.join(MODULES, CONFIG_PACKAGE);
const NESTED = Path.join(MODULES, 'rdf-parse/node_modules', CONFIG_PACKAGE);

/**
 * Directories of the virtual file system, as a mapping from path to entry names.
 * Entry names ending in a slash are directories, all others are files.
 */
let dirs: Record<string, string[]>;
/**
 * Files of the virtual file system, as a mapping from path to contents.
 */
let files: Record<string, string>;
let execCommands: string[];
let npmVersions: string[];
let failingCommand: RegExp | undefined;

function dirent(parentPath: string, entry: string): any {
  const directory = entry.endsWith('/');
  return {
    name: directory ? entry.slice(0, -1) : entry,
    parentPath,
    isDirectory: () => directory,
    isFile: () => !directory,
  };
}

/**
 * Declare the installed package tree that findInstalledPackages has to walk.
 * It holds a hoisted and a nested copy of the config package, a package without either,
 * and a plain file that is not a package at all.
 */
function setUpInstalledPackages(): void {
  dirs[MODULES] = [ '@comunica/', 'rdf-parse/', '.package-lock.json' ];
  dirs[Path.join(MODULES, '@comunica')] = [ 'config-query-sparql/', 'query-sparql/' ];
  dirs[HOISTED] = [];
  dirs[Path.join(MODULES, '@comunica/query-sparql')] = [];
  dirs[NESTED] = [];
}

/**
 * Declare a monorepo with one config package and one engine importing the given config file.
 */
function setUpMonorepo(configNames: string[], engineImport: string): void {
  dirs[`${MONOREPO}/engines`] = [ 'config-query-sparql/', 'query-sparql/' ];

  dirs[`${CONFIG_DIR}/config`] = configNames;
  dirs[`${CONFIG_DIR}/components`] = [];
  files[`${CONFIG_DIR}/package.json`] = JSON.stringify({
    name: CONFIG_PACKAGE,
    files: [ 'components', 'config' ],
  });

  files[`${MONOREPO}/engines/query-sparql/package.json`] = JSON.stringify({
    name: ENGINE,
    files: [ 'engine-default.js' ],
  });
  files[`${MONOREPO}/engines/query-sparql/config/config-default.json`] = JSON.stringify({
    import: [ engineImport ],
  });
}

/**
 * The config files that the installed package is expected to already contain.
 */
function setUpPublishedConfigs(configNames: string[]): void {
  for (const installed of [ HOISTED, NESTED ]) {
    for (const configName of configNames) {
      files[Path.join(installed, 'config', configName)] = '{}';
    }
  }
}

/**
 * The paths that were passed as configPath to the installed engine, in order.
 */
function invokedConfigPaths(): string[] {
  return execCommands
    .filter(command => command.startsWith('node -e'))
    .map(command => /configPath: "([^"]*)"/u.exec(command)![1]);
}

/**
 * The engine versions that were installed from npm, in order.
 */
function installedVersions(): string[] {
  return execCommands
    .filter(command => command.startsWith('npm install'))
    .map(command => command.slice(`npm install ${ENGINE}@`.length));
}

describe('testConfigCompat', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    dirs = {};
    files = {};
    execCommands = [];
    npmVersions = [ '5.0.0', '5.0.1', '5.1.3', '5.2.0', '5.3.0' ];
    failingCommand = undefined;

    jest.spyOn(console, 'log').mockImplementation(() => {
      // Keep the test output clean
    });

    jest.mocked(readdir).mockImplementation(<any> (async(path: string) => {
      const entries = dirs[path];
      if (!entries) {
        throw new Error(`Virtual readdir of unknown directory ${path}`);
      }
      return entries.map(entry => dirent(path, entry));
    }));
    jest.mocked(readFile).mockImplementation(<any> (async(path: string) => {
      const contents = files[path];
      if (contents === undefined) {
        throw new Error(`Virtual readFile of unknown file ${path}`);
      }
      return contents;
    }));
    jest.mocked(pathExists).mockImplementation(<any> (async(path: string) => path in files || path in dirs));
    jest.mocked(emptyDir).mockImplementation(<any> (async() => {
      // Nothing to clear in the virtual file system
    }));
    jest.mocked(copy).mockImplementation(<any> (async() => {
      // Nothing to copy in the virtual file system
    }));

    jest.mocked(exec).mockImplementation(<any> ((command: string, options: any, callback: any) => {
      execCommands.push(command);
      if (failingCommand?.test(command)) {
        callback(new Error(`Command failed: ${command}`));
        return;
      }
      callback(null, { stdout: command.startsWith('npm view') ? JSON.stringify(npmVersions) : '', stderr: '' });
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('for a single versioned config', () => {
    beforeEach(() => {
      setUpMonorepo([ 'config-default-v5-1-3.json' ], 'ccqs:config/config-default-v5-1-3.json');
      setUpInstalledPackages();
      setUpPublishedConfigs([ 'config-default-v5-1-3.json' ]);
    });

    it('should instantiate the engine with the config file inside the installed config package', async() => {
      await testConfigCompat(MONOREPO);

      // Resolving the config from the monorepo path would leave the sub-configs coming from npm
      expect(invokedConfigPaths()).toEqual([
        Path.join(HOISTED, 'config/config-default-v5-1-3.json'),
        Path.join(HOISTED, 'config/config-default-v5-1-3.json'),
      ]);
      for (const configPath of invokedConfigPaths()) {
        expect(configPath).not.toContain(CONFIG_DIR);
      }
    });

    it('should inject the monorepo config package into every installed copy', async() => {
      await testConfigCompat(MONOREPO);

      // Both the hoisted and the nested copy, since Components.js may resolve through either
      expect(emptyDir).toHaveBeenCalledWith(HOISTED);
      expect(emptyDir).toHaveBeenCalledWith(NESTED);
      expect(copy).toHaveBeenCalledWith(CONFIG_DIR, HOISTED, expect.anything());
      expect(copy).toHaveBeenCalledWith(CONFIG_DIR, NESTED, expect.anything());
    });

    it('should not inject nested node_modules of the monorepo config package', async() => {
      await testConfigCompat(MONOREPO);

      const { filter } = jest.mocked(copy).mock.calls[0][2];
      expect(filter!('/a/node_modules', '/b/node_modules')).toBe(false);
      expect(filter!('/a/config/config-default.json', '/b/config/config-default.json')).toBe(true);
    });

    it('should install the engine from npm before injecting', async() => {
      await testConfigCompat(MONOREPO);

      expect(installedVersions()).toEqual([ '5.2.0', '5.3.0' ]);
      expect(emptyDir).toHaveBeenCalledWith(INSTALL_PATH);
    });

    it('should reject when the engine can not instantiate the config', async() => {
      failingCommand = /^node -e/u;

      await expect(testConfigCompat(MONOREPO)).rejects.toThrow('Command failed: node -e');
    });

    it('should reject when the config package has no built components', async() => {
      delete dirs[`${CONFIG_DIR}/components`];

      await expect(testConfigCompat(MONOREPO)).rejects
        .toThrow(`Config package '${CONFIG_PACKAGE}' has no built components, run the build first`);
    });

    it('should skip engine versions that do not depend on the config package', async() => {
      delete dirs[HOISTED];
      delete dirs[NESTED];

      await testConfigCompat(MONOREPO);

      expect(copy).not.toHaveBeenCalled();
      expect(invokedConfigPaths()).toEqual([]);
    });

    it('should skip config files that the installed package does not contain yet', async() => {
      delete files[Path.join(HOISTED, 'config/config-default-v5-1-3.json')];

      await testConfigCompat(MONOREPO);

      expect(copy).not.toHaveBeenCalled();
      expect(invokedConfigPaths()).toEqual([]);
    });
  });

  describe('for a chain of versioned and unversioned configs', () => {
    beforeEach(() => {
      setUpMonorepo([
        'config-default.json',
        'config-default-v5-1-3.json',
        'config-default-v5-3-0.json',
        'config-rdfjs.json',
        'config-9.json',
        'README.md',
        'subdirectory/',
      ], 'ccqs:config/config-default-v5-3-0.json');
      setUpInstalledPackages();
      setUpPublishedConfigs([ 'config-default.json', 'config-default-v5-1-3.json', 'config-default-v5-3-0.json' ]);
    });

    it('should test each config against the engine versions that use it', async() => {
      await testConfigCompat(MONOREPO);

      // The newest config has no published engine above it, the others are bounded by the next config
      expect(installedVersions()).toEqual([ '5.2.0', '5.3.0', '5.0.1', '5.1.3' ]);
      expect(invokedConfigPaths()).toEqual([
        Path.join(HOISTED, 'config/config-default-v5-1-3.json'),
        Path.join(HOISTED, 'config/config-default-v5-1-3.json'),
        Path.join(HOISTED, 'config/config-default.json'),
        Path.join(HOISTED, 'config/config-default.json'),
      ]);
    });

    it('should test the newest config once a higher engine version is published', async() => {
      npmVersions = [ ...npmVersions, '5.4.0' ];

      await testConfigCompat(MONOREPO);

      expect(installedVersions()).toEqual([ '5.4.0', '5.4.0', '5.2.0', '5.3.0', '5.0.1', '5.1.3' ]);
      expect(invokedConfigPaths().slice(0, 2)).toEqual([
        Path.join(HOISTED, 'config/config-default-v5-3-0.json'),
        Path.join(HOISTED, 'config/config-default-v5-3-0.json'),
      ]);
    });

    it('should only consider configs of the same type as the engine config', async() => {
      await testConfigCompat(MONOREPO);

      for (const configPath of invokedConfigPaths()) {
        expect(configPath).not.toContain('config-rdfjs');
      }
    });
  });

  describe('for engines without a testable config', () => {
    beforeEach(() => {
      setUpInstalledPackages();
      setUpPublishedConfigs([ 'config-default-v5-1-3.json' ]);
    });

    it('should skip engines without a default config', async() => {
      setUpMonorepo([ 'config-default-v5-1-3.json' ], 'ccqs:config/config-default-v5-1-3.json');
      delete files[`${MONOREPO}/engines/query-sparql/config/config-default.json`];

      await testConfigCompat(MONOREPO);

      expect(execCommands).toEqual([]);
    });

    it('should skip engines whose default config imports nothing', async() => {
      setUpMonorepo([ 'config-default-v5-1-3.json' ], 'ccqs:config/config-default-v5-1-3.json');
      files[`${MONOREPO}/engines/query-sparql/config/config-default.json`] = JSON.stringify({});

      await testConfigCompat(MONOREPO);

      expect(execCommands).toEqual([]);
    });

    it('should skip engines that import an unversioned config', async() => {
      setUpMonorepo([ 'config-rdfjs.json' ], 'ccqs:config/config-rdfjs.json');

      await testConfigCompat(MONOREPO);

      expect(execCommands).toEqual([]);
    });

    it('should ignore entries in the engines directory that are not directories', async() => {
      setUpMonorepo([ 'config-default-v5-1-3.json' ], 'ccqs:config/config-default-v5-1-3.json');
      dirs[`${MONOREPO}/engines`] = [ ...dirs[`${MONOREPO}/engines`], 'README.md' ];

      await testConfigCompat(MONOREPO);

      expect(installedVersions()).toEqual([ '5.2.0', '5.3.0' ]);
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
