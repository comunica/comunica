import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraCountQuery} from "../lib/ActorRdfMetadataExtractHydraCountQuery";
const stream = require('streamify-array');
const quad = require('rdf-quad');

const queryEngine = require('@comunica/actor-init-sparql').newEngine();

describe('ActorRdfMetadataExtractHydraCountQuery', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraCountQuery module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraCountQuery).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraCountQuery constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraCountQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraCountQuery);
      expect(new (<any> ActorRdfMetadataExtractHydraCountQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraCountQuery objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractHydraCountQuery)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractHydraCountQuery instance', () => {
    let actor: ActorRdfMetadataExtractHydraCountQuery;
    let input: Readable;
    let inputAlt: Readable;
    let inputNone: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraCountQuery({ name: 'actor', bus, queryEngine });
      input = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#totalItems', 12345, ''),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputAlt = stream([
        quad('s1', 'p1', 'o1', ''),
        quad('pageUrl', 'http://rdfs.org/ns/void#triples', '12345', 'g1'),
        quad('s2', 'px', '5678', ''),
        quad('s3', 'p3', 'o3', ''),
      ]);
      inputNone = stream([
        quad('pageUrl', 'p1', 'o1', ''),
      ]);
    });

    it('should test', () => {
      return expect(actor.test({ pageUrl: '', metadata: input })).resolves.toBeTruthy();
    });

    it('should run on a stream where count is given', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is given in a void string', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputAlt })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is not given', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputNone })).resolves
        .toEqual({ metadata: { totalItems: Infinity }});
    });
  });
});
