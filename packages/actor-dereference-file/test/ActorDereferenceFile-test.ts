import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IActorDereferenceOutput } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorDereferenceFile } from '../lib/ActorDereferenceFile';

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const streamToString = require('stream-to-string');

function fileUrl(str: string): string {
  let pathName = path.resolve(str).replaceAll('\\', '/');

  // Windows drive letter must be prefixed with a slash
  if (!pathName.startsWith('/')) {
    pathName = `/${pathName}`;
  }

  return encodeURI(`file://${pathName}`);
}

describe('ActorDereferenceFile', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorDereferenceFile module', () => {
    it('should be a function', () => {
      expect(ActorDereferenceFile).toBeInstanceOf(Function);
    });

    it('should be a ActorDereferenceFile constructor', () => {
      expect(new ActorDereferenceFile({ name: 'actor', bus })).toBeInstanceOf(ActorDereferenceFile);
      expect(new ActorDereferenceFile({ name: 'actor', bus })).toBeInstanceOf(ActorDereference);
    });

    it('should not be able to create new ActorDereferenceFile objects without \'new\'', () => {
      expect(ActorDereferenceFile)
        .toThrow(`Class constructor ActorDereferenceFile cannot be invoked without 'new'`);
    });
  });

  describe('An ActorDereferenceFile instance', () => {
    let actor: ActorDereferenceFile;

    beforeEach(() => {
      actor = new ActorDereferenceFile({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ url: fileUrl(path.join(__dirname, 'dummy.ttl')), context })).resolves.toBe(true);
    });

    it('should test non-file URIs', async() => {
      await expect(actor.test({ url: path.join(__dirname, 'dummy.ttl'), context })).resolves.toBeTruthy();
    });

    it('should not test for non-existing files', async() => {
      await expect(actor.test({ url: 'fake.ttl', context })).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const p = path.join(__dirname, 'dummy.ttl');
      const result = await actor.run({ url: p, context });
      await expect(streamToString(result.data)).resolves.toEqual(fs.readFileSync(p).toString());
      expect(result).toMatchObject<Partial<IActorDereferenceOutput>>(
        {
          data: expect.anything(),
          exists: true,
          url: `file://${p}`,
        },
      );
    });

    it('should run for relative paths', async() => {
      // Relative paths are considered to start from the directory that `node` is ran in
      // for tests it will be the root of the repo
      const p = path.join(path.relative(process.cwd(), __dirname), 'dummy.ttl');
      const result = await actor.run({ url: p, context });
      await expect(streamToString(result.data)).resolves.toEqual(fs.readFileSync(p).toString());
      expect(result).toMatchObject<Partial<IActorDereferenceOutput>>(
        {
          data: expect.anything(),
          exists: true,
          url: pathToFileURL(p).href,
        },
      );
    });

    it('should run for file:/// paths', async() => {
      let p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p).toString();

      p = `file:///${p}`;
      const result = await actor.run({ url: p, context });
      await expect(streamToString(result.data)).resolves.toEqual(data);
      expect(result).toMatchObject<Partial<IActorDereferenceOutput>>(
        {
          data: expect.anything(),
          exists: true,
          url: p,
        },
      );
    });
  });
});
