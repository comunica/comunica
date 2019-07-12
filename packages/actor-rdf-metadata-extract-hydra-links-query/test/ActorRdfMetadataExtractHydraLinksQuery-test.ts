import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraLinksQuery} from "../lib/ActorRdfMetadataExtractHydraLinksQuery";
const stream = require('streamify-array');

describe('ActorRdfMetadataExtractHydraLinksQuery', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractHydraLinksQuery module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractHydraLinksQuery).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractHydraLinksQuery constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractHydraLinksQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtractHydraLinksQuery);
      expect(new (<any> ActorRdfMetadataExtractHydraLinksQuery)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractHydraLinksQuery objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractHydraLinksQuery)(); }).toThrow();
    });
  });

  describe('An ActorRdfMetadataExtractHydraLinksQuery instance', () => {
    let actor: ActorRdfMetadataExtractHydraLinksQuery;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraLinksQuery({ name: 'actor', bus, queryEngine: null });
      input = stream([]);
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: input })).resolves.toBeTruthy();
    });

    it('should run on a stream with all properties', () => {
      actor.queryData = () => Promise.resolve({
        first: 'FIRST',
        graph: 'G',
        last: 'LAST',
        next: 'NEXT',
        previous: 'PREVIOUS',
      });
      return expect(actor.run({ url: 'url', metadata: input })).resolves
        .toEqual({
          metadata: {
            first: 'FIRST',
            last: 'LAST',
            next: 'NEXT',
            previous: 'PREVIOUS',
          },
        });
    });
  });
});
