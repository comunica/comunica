import {ActorRdfParse} from "@comunica/bus-rdf-parse";
import {Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfParseJsonLd} from "../lib/ActorRdfParseJsonLd";
const stringToStream = require('streamify-string');

describe('ActorRdfParseJsonLd', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfParseJsonLd module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseJsonLd).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseJsonLd constructor', () => {
      expect(new (<any> ActorRdfParseJsonLd)({ name: 'actor', bus, mediaTypes: {} }))
        .toBeInstanceOf(ActorRdfParseJsonLd);
      expect(new (<any> ActorRdfParseJsonLd)({ name: 'actor', bus, mediaTypes: {} }))
        .toBeInstanceOf(ActorRdfParse);
    });

    it('should not be able to create new ActorRdfParseJsonLd objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseJsonLd)(); }).toThrow();
    });

    it('when constructed with optional mediaTypes should set the mediaTypes', () => {
      expect(new ActorRdfParseJsonLd({ name: 'actor', bus, mediaTypes: {} }).mediaTypes).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseJsonLd({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }); })
        .toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseJsonLd({ name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5 }).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseJsonLd({ name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5 })
        .mediaTypes).toEqual({
          A: 1,
          B: 0.5,
          C: 0,
        });
    });
  });

  describe('An ActorRdfParseJsonLd instance', () => {
    let actor: ActorRdfParseJsonLd;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
        'application/json': 1.0,
        'application/ld+json': 1.0,
      }, name: 'actor'});
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
          }`);
      });

      it('should test on application/json', () => {
        return expect(actor.test({ parse: { input, mediaType: 'application/json' }})).resolves.toBeTruthy();
      });

      it('should test on application/ld+json', () => {
        return expect(actor.test({ parse: { input, mediaType: 'application/ld+json'}})).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ parse: { input, mediaType: 'application/n-triples'}})).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ parse: { input, mediaType: 'application/ld+json'}})
          .then((output) => {
            return new Promise((resolve, reject) => {
              const quads: RDF.Quad[] = [];
              output.parse.quads.on('data', (quad) => quads.push(quad));
              output.parse.quads.on('end', () => {
                if (quads.length === 2) {
                  resolve();
                } else {
                  reject();
                }
              });
            });
          });
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaType: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaType: true })).resolves.toEqual({ mediaType: { mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }}});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0.5 });
        return expect(actor.run({ mediaType: true })).resolves.toEqual({ mediaType: { mediaTypes: {
          'application/json': 0.5,
          'application/ld+json': 0.5,
        }}});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0 });
        return expect(actor.run({ mediaType: true })).resolves.toEqual({ mediaType: { mediaTypes: {
          'application/json': 0,
          'application/ld+json': 0,
        }}});
      });
    });
  });
});
