import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as Path from 'node:path';
import {
  checkBundleDuplicates,
  findBundleDuplicates,
  findDuplicatesInSourceMap,
  getSourcePackageDir,
  readPackageInfo,
  renderBundleDuplicates,
} from '../lib/bundleDuplicates';

describe('bundleDuplicates', () => {
  let monorepo: string;
  let engineDir: string;

  beforeEach(() => {
    monorepo = mkdtempSync(Path.join(tmpdir(), 'bundle-duplicates-'));
    engineDir = Path.join(monorepo, 'engines', 'a');
    mkdirSync(engineDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(monorepo, { recursive: true, force: true });
  });

  function writePackage(dir: string, packageJson: Record<string, string> | undefined): void {
    mkdirSync(Path.join(monorepo, dir), { recursive: true });
    if (packageJson) {
      writeFileSync(Path.join(monorepo, dir, 'package.json'), JSON.stringify(packageJson));
    }
  }

  function writeSourceMap(engine: string, file: string, sources: string[]): void {
    mkdirSync(Path.join(monorepo, 'engines', engine), { recursive: true });
    writeFileSync(Path.join(monorepo, 'engines', engine, file), JSON.stringify({ version: 3, sources }));
  }

  describe('getSourcePackageDir', () => {
    it('handles webpack sources', () => {
      expect(getSourcePackageDir(monorepo, engineDir, 'webpack://Comunica/../../node_modules/n3/src/N3Parser.js'))
        .toBe('node_modules/n3');
    });

    it('handles Vite sources', () => {
      expect(getSourcePackageDir(monorepo, engineDir, '../../node_modules/n3/src/N3Parser.js'))
        .toBe('node_modules/n3');
    });

    it('handles scoped packages', () => {
      expect(getSourcePackageDir(monorepo, engineDir, '../../node_modules/@traqula/core/dist/index.js'))
        .toBe('node_modules/@traqula/core');
    });

    it('handles nested packages', () => {
      expect(getSourcePackageDir(monorepo, engineDir, '../../node_modules/a/node_modules/@b/c/lib/d/index.js'))
        .toBe('node_modules/a/node_modules/@b/c');
      expect(getSourcePackageDir(monorepo, engineDir, '../../packages/p/node_modules/a/index.js'))
        .toBe('packages/p/node_modules/a');
    });

    it('handles virtual modules and queries', () => {
      expect(getSourcePackageDir(monorepo, engineDir, '\0../../node_modules/a/index.js?commonjs-exports'))
        .toBe('node_modules/a');
    });

    it('handles workspace packages', () => {
      expect(getSourcePackageDir(monorepo, engineDir, 'webpack://Comunica/../../packages/core/lib/Bus.js'))
        .toBe('packages/core');
      expect(getSourcePackageDir(monorepo, engineDir, 'webpack://Comunica/./lib/QueryEngine.js'))
        .toBe('engines/a');
    });

    it('attributes bundler runtime sources to the engine', () => {
      expect(getSourcePackageDir(monorepo, engineDir, 'webpack://Comunica/webpack/runtime/global')).toBe('engines/a');
      expect(getSourcePackageDir(monorepo, engineDir, '\0commonjsHelpers.js')).toBe('engines/a');
    });

    it('ignores sources outside of packages', () => {
      expect(getSourcePackageDir(monorepo, engineDir, '../../lib/a.js')).toBeUndefined();
      expect(getSourcePackageDir(monorepo, engineDir, '../../../a.js')).toBeUndefined();
    });
  });

  describe('readPackageInfo', () => {
    it('reads the name and version', () => {
      writePackage('node_modules/a', { name: 'a', version: '1.0.0' });
      expect(readPackageInfo(monorepo, 'node_modules/a')).toEqual({ name: 'a', version: '1.0.0' });
    });

    it('falls back to the directory name if there is no package.json', () => {
      writePackage('node_modules/a/node_modules/@b/c', undefined);
      expect(readPackageInfo(monorepo, 'node_modules/a/node_modules/@b/c'))
        .toEqual({ name: '@b/c', version: 'unknown' });
    });

    it('falls back to the directory name if package.json has no name or version', () => {
      writePackage('node_modules/a', {});
      expect(readPackageInfo(monorepo, 'node_modules/a')).toEqual({ name: 'a', version: 'unknown' });
    });
  });

  describe('findDuplicatesInSourceMap', () => {
    it('finds packages with multiple copies', () => {
      writePackage('node_modules/a', { name: 'a', version: '2.0.0' });
      writePackage('node_modules/b/node_modules/a', { name: 'a', version: '1.0.0' });
      writePackage('node_modules/b', { name: 'b', version: '1.0.0' });
      writePackage('node_modules/@c/d', { name: '@c/d', version: '1.0.0' });
      writePackage('node_modules/@comunica/core', { name: '@comunica/core', version: '4.0.0' });
      writePackage('packages/core', { name: '@comunica/core', version: '5.0.0' });
      writeSourceMap('a', 'comunica-browser.js.map', [
        'webpack://Comunica/../../node_modules/b/node_modules/a/index.js',
        'webpack://Comunica/../../node_modules/a/index.js',
        'webpack://Comunica/../../node_modules/a/other.js',
        'webpack://Comunica/../../node_modules/b/index.js',
        'webpack://Comunica/../../node_modules/@c/d/index.js',
        'webpack://Comunica/../../packages/core/lib/index.js',
        'webpack://Comunica/../../node_modules/@comunica/core/lib/index.js',
        'webpack://Comunica/webpack/runtime/global',
      ]);
      expect(findDuplicatesInSourceMap(monorepo, 'a (webpack)', Path.join(engineDir, 'comunica-browser.js.map')))
        .toEqual([
          {
            bundle: 'a (webpack)',
            packageName: '@comunica/core',
            copies: [
              { path: 'node_modules/@comunica/core', version: '4.0.0' },
              { path: 'packages/core', version: '5.0.0' },
            ],
          },
          {
            bundle: 'a (webpack)',
            packageName: 'a',
            copies: [
              { path: 'node_modules/a', version: '2.0.0' },
              { path: 'node_modules/b/node_modules/a', version: '1.0.0' },
            ],
          },
        ]);
    });

    it('finds no duplicates if each package has one copy', () => {
      writePackage('node_modules/a', { name: 'a', version: '1.0.0' });
      writeSourceMap('a', 'comunica-browser-vite.js.map', [
        '../../node_modules/a/index.js',
        '../../node_modules/a/b.js',
      ]);
      expect(findDuplicatesInSourceMap(monorepo, 'a (vite)', Path.join(engineDir, 'comunica-browser-vite.js.map')))
        .toEqual([]);
    });
  });

  describe('findBundleDuplicates', () => {
    it('checks the source maps of all bundles', () => {
      writePackage('node_modules/a', { name: 'a', version: '2.0.0' });
      writePackage('node_modules/b/node_modules/a', { name: 'a', version: '1.0.0' });
      const sources = [ '../../node_modules/a/index.js', '../../node_modules/b/node_modules/a/index.js' ];
      writeSourceMap('b', 'comunica-browser.js.map', sources.map(source => `webpack://Comunica/${source}`));
      writeSourceMap('a', 'comunica-browser-vite.js.map', sources);
      mkdirSync(Path.join(monorepo, 'engines', 'config-a'));
      expect(findBundleDuplicates(monorepo).map(({ bundle, packageName }) => `${bundle}: ${packageName}`))
        .toEqual([ 'a (vite): a', 'b (webpack): a' ]);
    });

    it('accepts a relative monorepo path', () => {
      writeSourceMap('a', 'comunica-browser.js.map', []);
      expect(findBundleDuplicates(Path.relative(process.cwd(), monorepo))).toEqual([]);
    });

    it('throws if no source maps were built', () => {
      expect(() => findBundleDuplicates(monorepo)).toThrow('No source maps of browser bundles were found in');
    });
  });

  describe('renderBundleDuplicates', () => {
    it('renders the copies of each duplicate package', () => {
      expect(renderBundleDuplicates([{
        bundle: 'a (webpack)',
        packageName: 'b',
        copies: [
          { path: 'node_modules/b', version: '2.0.0' },
          { path: 'node_modules/c/node_modules/b', version: '1.0.0' },
        ],
      }])).toBe(`a (webpack): b
  - 2.0.0 in node_modules/b
  - 1.0.0 in node_modules/c/node_modules/b
`);
    });
  });

  describe('checkBundleDuplicates', () => {
    beforeEach(() => {
      writePackage('node_modules/a', { name: 'a', version: '2.0.0' });
      writePackage('node_modules/b/node_modules/a', { name: 'a', version: '1.0.0' });
      writeSourceMap('a', 'comunica-browser.js.map', [
        '../../node_modules/a/index.js',
        '../../node_modules/b/node_modules/a/index.js',
      ]);
    });

    it('fails on disallowed duplicates', () => {
      const { report, failed } = checkBundleDuplicates(monorepo, []);
      expect(failed).toBe(true);
      expect(report).toContain('Multiple copies of the following packages were bundled.');
      expect(report)
        .toContain('a (webpack): a\n  - 2.0.0 in node_modules/a\n  - 1.0.0 in node_modules/b/node_modules/a\n');
    });

    it('passes on allowed duplicates', () => {
      expect(checkBundleDuplicates(monorepo, [ 'a' ])).toEqual({
        report: 'No disallowed duplicate packages were found in the browser bundles.\n',
        failed: false,
      });
    });

    it('reports allowed packages that are not duplicated anymore', () => {
      expect(checkBundleDuplicates(monorepo, [ 'a', 'b', 'c' ])).toEqual({
        report: `No disallowed duplicate packages were found in the browser bundles.

These packages are allowed to be duplicated, but are not anymore, so they can be removed from the allowed packages: b, c
`,
        failed: false,
      });
    });
  });
});
