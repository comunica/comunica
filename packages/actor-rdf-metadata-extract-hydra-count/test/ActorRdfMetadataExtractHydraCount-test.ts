import type { Readable } from 'stream';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataExtractHydraCount } from '../lib/ActorRdfMetadataExtractHydraCount';

const quad = require('rdf-quad');
const stream = require('streamify-array');

describe('ActorRdfMetadataExtractHydraCount', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraCount module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraCount).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraCount constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: []}))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraCount);
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: []}))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraCount objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractHydraCount)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractHydraCount instance', () => {
    let actor: ActorRdfMetadataExtractHydraCount;
    let input: Readable;
    let inputNone: Readable;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraCount({ name: 'actor', bus, predicates: [ 'px', 'py' ]});
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('g1', 'py', '12345', ''),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputNone = stream([
        quad('s1', 'p1', 'o1', ''),
      ]);
      context = new ActionContext();
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: input, requestTime: 0, context })).resolves.toBeTruthy();
    });

    it('should run on a stream where count is given', () => {
      return expect(actor.run({ url: '', metadata: input, requestTime: 0, context })).resolves
        .toEqual({ metadata: { cardinality: { type: 'estimate', value: 12_345 }}});
    });

    it('should run on a stream where count is not given', () => {
      return expect(actor.run({ url: '', metadata: inputNone, requestTime: 0, context })).resolves
        .toEqual({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
    });
  });
});
