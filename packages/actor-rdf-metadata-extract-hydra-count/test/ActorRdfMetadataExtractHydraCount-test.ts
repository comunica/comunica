import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraCount} from "../lib/ActorRdfMetadataExtractHydraCount";
const stream = require('streamify-array');
const quad = require('rdf-quad');

describe('ActorRdfMetadataExtractHydraCount', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraCount module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraCount).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraCount constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: [] }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraCount);
      expect(new (<any> ActorRdfMetadataExtractHydraCount)({ name: 'actor', bus, predicates: [] }))
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

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraCount({ name: 'actor', bus, predicates: [ 'px', 'py' ] });
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
      return expect(actor.test({ url: '', metadata: input })).resolves.toBeTruthy();
    });

    it('should run on a stream where count is given', () => {
      return expect(actor.run({ url: '', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is not given', () => {
      return expect(actor.run({ url: '', metadata: inputNone })).resolves
        .toEqual({ metadata: { totalItems: Infinity }});
    });
  });
});
