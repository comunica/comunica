import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as Path from 'node:path';
import { readmeCheck, validateActorReadme } from '../lib/readmeCheck';

const VALID = `# Comunica Some Actor

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join)
actor that joins things.

## Install
`;

describe('validateActorReadme', () => {
  it('accepts a valid description', () => {
    const busExists = jest.fn(() => true);
    expect(validateActorReadme(VALID, busExists)).toBeUndefined();
    expect(busExists).toHaveBeenCalledWith('rdf-join');
  });

  it('accepts a description with "A"', () => {
    expect(validateActorReadme(
      'A [Query Operation](link) actor that does something.\n',
      () => true,
    )).toBeUndefined();
  });

  it('rejects a README without description', () => {
    expect(validateActorReadme(
      '# Actor\n\nA comunica Some Actor.\n\nThis actor does something.\n',
      () => true,
    )).toMatch('README must contain a description');
  });

  it('rejects a description referring to an unknown bus', () => {
    expect(validateActorReadme(VALID, () => false))
      .toBe('README refers to bus "RDF Join", but no package "bus-rdf-join" exists.');
  });
});

describe('readmeCheck', () => {
  let dir: string;

  function addPackage(name: string, readme?: string): void {
    mkdirSync(Path.join(dir, 'packages', name), { recursive: true });
    writeFileSync(Path.join(dir, 'packages', name, 'package.json'), '{}');
    if (readme !== undefined) {
      writeFileSync(Path.join(dir, 'packages', name, 'README.md'), readme);
    }
  }

  beforeEach(() => {
    dir = mkdtempSync(Path.join(tmpdir(), 'comunica-readme-check-'));
    addPackage('bus-rdf-join', '# Bus');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns no failures for valid actors', () => {
    addPackage('actor-rdf-join-a', VALID);
    expect(readmeCheck(dir)).toEqual([]);
  });

  it('returns failures for invalid or missing READMEs', () => {
    addPackage('actor-rdf-join-a', VALID);
    addPackage('actor-rdf-join-b', '# Invalid');
    addPackage('actor-rdf-join-c');
    expect(readmeCheck(dir)).toEqual([
      'actor-rdf-join-b: README must contain a description of the form "An [Bus Name](link-to-bus) actor that ...".',
      'actor-rdf-join-c: README is missing.',
    ]);
  });

  it('ignores abstract actors, non-actor packages and removed packages', () => {
    addPackage('actor-abstract-a', '# Invalid');
    addPackage('utils-a', '# Invalid');
    mkdirSync(Path.join(dir, 'packages', 'actor-removed'));
    writeFileSync(Path.join(dir, 'packages', 'actor-removed', 'README.md'), '# Removed');
    expect(readmeCheck(dir)).toEqual([]);
  });
});
