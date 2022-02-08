import * as fs from 'fs';
import * as path from 'path';
import type { IActorDereferenceOutput } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import * as streamToString from 'stream-to-string';
import { ActorDereferenceFile } from '../lib/ActorDereferenceFile';

function fileUrl(str: string): string {
  let pathName = path.resolve(str).replace(/\\/ug, '/');

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
      expect(ActorDereferenceFile).toThrow();
    });
  });

  describe('An ActorDereferenceFile instance', () => {
    let actor: ActorDereferenceFile;

    beforeEach(() => {
      actor = new ActorDereferenceFile({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ url: fileUrl(path.join(__dirname, 'dummy.ttl')), context })).resolves.toEqual(true);
    });

    it('should test non-file URIs', () => {
      return expect(actor.test({ url: path.join(__dirname, 'dummy.ttl'), context })).resolves.toBeTruthy();
    });

    it('should not test for non-existing files', () => {
      return expect(actor.test({ url: 'fake.ttl', context })).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const p = path.join(__dirname, 'dummy.ttl');
      const result = await actor.run({ url: p, context });
      expect(await streamToString(result.data)).toEqual(fs.readFileSync(p).toString());
      expect(result).toMatchObject<Partial<IActorDereferenceOutput>>(
        {
          data: expect.anything(),
          exists: true,
          url: p,
        },
      );
    });

    it('should run for file:/// paths', async() => {
      let p = path.join(__dirname, 'dummy.ttl');
      const data = fs.readFileSync(p).toString();

      p = `file:///${p}`;
      const result = await actor.run({ url: p, context });
      expect(await streamToString(result.data)).toEqual(data);
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
