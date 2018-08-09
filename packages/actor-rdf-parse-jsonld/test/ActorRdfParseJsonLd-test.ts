import {Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseJsonLd} from "../lib/ActorRdfParseJsonLd";
const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

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
    let inputGraphs: Readable;

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
        inputGraphs = stringToStream(`[
          {
            "@id": "http://example.org/g0",
            "@graph": [
              {
                "@id": "http://example.org/a",
                "http://example.org/b": "http://example.org/c",
                "http://example.org/d": { "@value": "http://example.org/e", "@language": "nl" }
              }
            ]
          },
          {
            "@id": "http://example.org/g1",
            "@graph": [
              {
                "http://example.org/b": "http://example.org/c",
                "http://example.org/d": "http://example.org/e"
              }
            ]
          }
            ]`);
      });

      it('should test on application/json', () => {
        return expect(actor.test({ handle: { input }, handleMediaType: 'application/json' })).resolves.toBeTruthy();
      });

      it('should test on application/ld+json', () => {
        return expect(actor.test({ handle: { input }, handleMediaType: 'application/ld+json' })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: { input }, handleMediaType: 'application/n-triples' })).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ handle: { input }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

      it('should run for graphs', () => {
        return actor.run({ handle: { input: inputGraphs }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"', 'http://example.org/g0'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"@nl', 'http://example.org/g0'),
            quad('_:b1', 'http://example.org/b', '"http://example.org/c"', 'http://example.org/g1'),
            quad('_:b1', 'http://example.org/d', '"http://example.org/e"', 'http://example.org/g1'),
          ]));
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0.5,
          'application/ld+json': 0.5,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, name: 'actor', priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0,
          'application/ld+json': 0,
        }});
      });
    });
  });
});
