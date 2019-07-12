import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraCountQuery} from "../lib/ActorRdfMetadataExtractHydraCountQuery";

const stream = require('streamify-array');

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

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraCountQuery({ name: 'actor', bus, queryEngine: null });
      input = stream([]);
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: input })).resolves.toBeTruthy();
    });

    it('should run on a stream where count is given', () => {
      actor.queryData = () => Promise.resolve({ totalItems: 12345 });
      return expect(actor.run({ url: 'url', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is given in a string', () => {
      actor.queryData = () => Promise.resolve({ totalItems: '12345' });
      return expect(actor.run({ url: 'url', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: 12345 }});
    });

    it('should run on a stream where count is not given', () => {
      actor.queryData = () => Promise.resolve({});
      return expect(actor.run({ url: 'url', metadata: input })).resolves
        .toEqual({ metadata: { totalItems: Infinity }});
    });
  });
});
