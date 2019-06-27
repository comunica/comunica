import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {Readable} from "stream";
import {ActorRdfMetadataExtractHydraLinksQuery} from "../lib/ActorRdfMetadataExtractHydraLinksQuery";
const stream = require('streamify-array');
const quad = require('rdf-quad');

const queryEngine = require('@comunica/actor-init-sparql').newEngine();

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
    let inputAll: Readable;
    let inputSome: Readable;
    let inputAlt: Readable;
    let inputMixed: Readable;
    let inputNone: Readable;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractHydraLinksQuery({ name: 'actor', bus, queryEngine });
      inputAll = stream([
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#first', 'FIRST', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#next', 'NEXT', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#previous', 'PREVIOUS', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#last', 'LAST', ''),
      ]);
      inputSome = stream([
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#first', 'FIRST', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#last', 'LAST', ''),
      ]);
      inputAlt = stream([
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#firstPage', 'FIRST', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#nextPage', 'NEXT', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#previousPage', 'PREVIOUS', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#lastPage', 'LAST', ''),
      ]);
      inputMixed = stream([
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#firstPage', 'FIRST', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#previousPage', 'PREVIOUS', ''),
        quad('pageUrl', 'http://www.w3.org/ns/hydra/core#lastPage', 'LAST', ''),
      ]);
      inputNone = stream([
        quad('pageUrl', 'p1', 'o1', ''),
      ]);
    });

    it('should test', () => {
      return expect(actor.test({ pageUrl: '', metadata: inputAll })).resolves.toBeTruthy();
    });

    it('should run on a stream with all properties', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputAll })).resolves
        .toEqual({
          metadata: {
            first: 'FIRST',
            last: 'LAST',
            next: 'NEXT',
            previous: 'PREVIOUS',
          },
        });
    });

    it('should run on a stream with some properties', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputSome })).resolves
        .toEqual({
          metadata: {
            first: 'FIRST',
            last: 'LAST',
          },
        });
    });

    it('should run on a stream with all properties by alternative predicate', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputAlt })).resolves
        .toEqual({
          metadata: {
            first: 'FIRST',
            last: 'LAST',
            next: 'NEXT',
            previous: 'PREVIOUS',
          },
        });
    });

    it('should run on a stream with some mixed properties', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputMixed })).resolves
        .toEqual({
          metadata: {
            first: 'FIRST',
            last: 'LAST',
            previous: 'PREVIOUS',
          },
        });
    });

    it('should run on a stream with no properties', () => {
      return expect(actor.run({ pageUrl: 'pageUrl', metadata: inputNone })).resolves
        .toEqual({
          metadata: {},
        });
    });
  });
});
