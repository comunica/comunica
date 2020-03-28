import {Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseJsonLd} from "../lib/ActorRdfParseJsonLd";
const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

describe('ActorRdfParseJsonLd', () => {
  let bus;
  let mediatorHttp: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate: (args) => {
        // Error
        if (args.input.indexOf('error') >= 0) {
          return Promise.resolve({
            ok: false,
            statusText: 'some error',
          });
        }

        return Promise.resolve({
          body: streamifyString(`{
          "@context": {
            "@vocab": "http://example.org/"
          }
        }`),
          ok: true,
        });
      },
    };
  });

  describe('The ActorRdfParseJsonLd module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseJsonLd).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseJsonLd constructor', () => {
      expect(new (<any> ActorRdfParseJsonLd)({ name: 'actor', bus, mediaTypes: {}, mediatorHttp }))
        .toBeInstanceOf(ActorRdfParseJsonLd);
    });

    it('should not be able to create new ActorRdfParseJsonLd objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseJsonLd)(); }).toThrow();
    });

    it('when constructed with optional mediaTypes should set the mediaTypes', () => {
      expect(new ActorRdfParseJsonLd({ name: 'actor', bus, mediaTypes: {}, mediatorHttp }).mediaTypes).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseJsonLd(
        { name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5, mediatorHttp }); })
        .toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseJsonLd(
        { name: 'actor', bus, mediaTypes: {}, priorityScale: 0.5, mediatorHttp }).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseJsonLd(
        { name: 'actor', bus, mediaTypes: { A: 2, B: 1, C: 0 }, priorityScale: 0.5, mediatorHttp })
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
    let inputRemoteContext: Readable;
    let inputRemoteContextErr: Readable;
    let inputLinkHeader: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
        'application/json': 1.0,
        'application/ld+json': 1.0,
      }, mediatorHttp, name: 'actor' });
      input = stringToStream(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
          }`);
    });

    describe('for parsing', () => {
      beforeEach(() => {
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
        inputRemoteContext = stringToStream(`{
            "@context": "http://schema.org/",
            "@id": "http://example.org/a",
            "b": "http://example.org/c",
            "d": "http://example.org/e"
          }`);
        inputRemoteContextErr = stringToStream(`{
            "@context": "http://schema.org/error",
            "@id": "http://example.org/a",
            "b": "http://example.org/c",
            "d": "http://example.org/e"
          }`);
        inputLinkHeader = stringToStream(`{
          "@id": "http://www.example.org/",
          "term": "value"
        }`);
      });

      it('should test on application/json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/json' }))
          .resolves.toBeTruthy();
      });

      it('should test on application/ld+json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/ld+json' }))
          .resolves.toBeTruthy();
      });

      it('should test on bla+json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'bla+json' }))
          .resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' }, handleMediaType: 'application/n-triples' }))
          .rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

      it('should run for graphs', () => {
        return actor.run({ handle: { input: inputGraphs, baseIRI: '' }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"', 'http://example.org/g0'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"@nl', 'http://example.org/g0'),
            quad('_:b1', 'http://example.org/b', '"http://example.org/c"', 'http://example.org/g1'),
            quad('_:b1', 'http://example.org/d', '"http://example.org/e"', 'http://example.org/g1'),
          ]));
      });

      it('should run for a remote context', () => {
        return actor.run({ handle: { input: inputRemoteContext, baseIRI: '' }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

      it('should error for an invalid remote context', () => {
        return actor.run(
          { handle: { input: inputRemoteContextErr, baseIRI: '' }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(arrayifyStream(output.handle.quads)).rejects
            .toThrow(new Error('Failed to load remote context http://schema.org/error: ' +
              'No valid context was found at http://schema.org/error: some error')));
      });

      it('should run for a JSON doc with a context link header', () => {
        // tslint:disable-next-line:max-line-length
        const headers = new Headers({ Link: '<http://example.org/>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' });
        return actor.run(
          { handle: { input: inputLinkHeader, baseIRI: '', headers }, handleMediaType: 'application/json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://www.example.org/', 'http://example.org/term', '"value"'),
          ]));
      });

      it('should run for a doc with JSON extension type with a context link header', () => {
        // tslint:disable-next-line:max-line-length
        const headers = new Headers({ Link: '<http://example.org/>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' });
        return actor.run(
          { handle: { input: inputLinkHeader, baseIRI: '', headers }, handleMediaType: 'bla+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://www.example.org/', 'http://example.org/term', '"value"'),
          ]));
      });

      it('should error on a JSON doc with a context link header without type', () => {
        // tslint:disable-next-line:max-line-length
        const headers = new Headers({ Link: '<http://example.org/>; rel="http://www.w3.org/ns/json-ld#context"' });
        return actor.run(
          { handle: { input: inputLinkHeader, baseIRI: '', headers }, handleMediaType: 'bla+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://www.example.org/', 'http://example.org/term', '"value"'),
          ]));
      });

      it('should error on a JSON doc without a context link header', () => {
        // tslint:disable-next-line:max-line-length
        const headers = new Headers({});
        return expect(actor.run(
          { handle: { input: inputLinkHeader, baseIRI: 'IRI', headers }, handleMediaType: 'application/json' })).rejects
            .toThrow(new Error('Missing context link header for media type application/json on IRI'));
      });

      it('should ignore a context link header on a valid JSON-LD document', () => {
        // tslint:disable-next-line:max-line-length
        const headers = new Headers({ Link: '<http://example.org/error>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' });
        return actor.run(
          { handle: { input, baseIRI: '', headers }, handleMediaType: 'application/ld+json' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

      it('should error for multiple context link headers', () => {
        const headers = new Headers({ Link:
          '<http://example.org/valid1>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json",'
          + '<http://example.org/valid2>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' });
        return expect(actor.run(
          { handle: { input: inputLinkHeader, baseIRI: 'mult', headers }, handleMediaType: 'application/json' }))
          .rejects.toThrow(new Error('Multiple JSON-LD context link headers were found on mult'));
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
        }, mediatorHttp, name: 'actor', priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0.5,
          'application/ld+json': 0.5,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseJsonLd({ bus, mediaTypes: {
          'application/json': 1.0,
          'application/ld+json': 1.0,
        }, mediatorHttp, name: 'actor', priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          'application/json': 0,
          'application/ld+json': 0,
        }});
      });

      it('should not have duplicate results on multiple _read calls', () => {
        return actor.run({ handle: { input, baseIRI: '' }, handleMediaType: 'application/ld+json' })
          .then(async (output) => {
            (<any> output.handle.quads)._read();
            (<any> output.handle.quads)._read();
            expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
              quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
              quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
            ]);
          });
      });
    });
  });
});
