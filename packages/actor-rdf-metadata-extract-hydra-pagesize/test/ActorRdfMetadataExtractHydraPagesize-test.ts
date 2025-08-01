import type { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { streamifyArray } from 'streamify-array';
import { ActorRdfMetadataExtractHydraPagesize } from '../lib/ActorRdfMetadataExtractHydraPagesize';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

describe('ActorRdfMetadataExtractHydraPagesize', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractHydraPagesize instance', () => {
    let actor: ActorRdfMetadataExtractHydraPagesize;
    let input: Readable;
    let inputNone: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraPagesize({ name: 'actor', bus, predicates: [ 'px', 'py' ]});
      input = streamifyArray([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'py', '12345', ''),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputNone = streamifyArray([
        quad('s1', 'p1', 'o1', ''),
      ]);
      context = new ActionContext();
    });

    it('should test', async() => {
      await expect(actor.test({ url: '', metadata: input, requestTime: 0, context })).resolves.toPassTestVoid();
    });

    it('should run on a stream where pageSize is given', async() => {
      await expect(actor.run({ url: '', metadata: input, requestTime: 0, context })).resolves
        .toEqual({ metadata: { pageSize: 12_345 }});
    });

    it('should run on a stream where pageSize is not given', async() => {
      await expect(actor.run({ url: '', metadata: inputNone, requestTime: 0, context })).resolves
        .toEqual({ metadata: { pageSize: undefined }});
    });
  });
});
