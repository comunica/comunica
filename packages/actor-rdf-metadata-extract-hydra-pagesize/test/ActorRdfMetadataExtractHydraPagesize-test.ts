import type { Readable } from 'stream';
import { Bus } from '@comunica/core';
import { ActorRdfMetadataExtractHydraPagesize } from '../lib/ActorRdfMetadataExtractHydraPagesize';
const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorRdfMetadataExtractHydraPagesize', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractHydraPagesize instance', () => {
    let actor: ActorRdfMetadataExtractHydraPagesize;
    let input: Readable;
    let inputNone: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraPagesize({ name: 'actor', bus, predicates: [ 'px', 'py' ]});
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'py', '12345', ''),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputNone = stream([
        quad('s1', 'p1', 'o1', ''),
      ]);
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: input, requestTime: 0 })).resolves.toBeTruthy();
    });

    it('should run on a stream where pageSize is given', () => {
      return expect(actor.run({ url: '', metadata: input, requestTime: 0 })).resolves
        .toEqual({ metadata: { pageSize: 12_345 }});
    });

    it('should run on a stream where pageSize is not given', () => {
      return expect(actor.run({ url: '', metadata: inputNone, requestTime: 0 })).resolves
        .toEqual({ metadata: { pageSize: undefined }});
    });
  });
});
