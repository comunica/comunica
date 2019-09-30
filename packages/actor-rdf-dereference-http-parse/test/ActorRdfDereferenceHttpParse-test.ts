import {ActorRdfDereference} from "@comunica/bus-rdf-dereference";
import {Bus} from "@comunica/core";
import {MediatorRace} from "@comunica/mediator-race";
import "isomorphic-fetch";
import {PassThrough} from "stream";
import {ActorRdfDereferenceHttpParse} from "../lib/ActorRdfDereferenceHttpParse";

describe('ActorRdfDereferenceHttpParse', () => {
  let bus;
  let mediatorHttp;
  let mediatorRdfParse;
  let mediaMappings;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = new MediatorRace({ name: 'mediator-http', bus: new Bus({ name: 'bus-http' }) });
    mediatorRdfParse = new MediatorRace({ name: 'mediator-parse', bus: new Bus({ name: 'bus-parse' }) });
    mediaMappings = {
      x: 'y',
    };
  });

  describe('The ActorRdfDereferenceHttpParse module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferenceHttpParse).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferenceHttpParse constructor', () => {
      expect(new (<any> ActorRdfDereferenceHttpParse)(
        { name: 'actor', bus, mediatorHttp, mediatorRdfParse, mediaMappings }))
        .toBeInstanceOf(ActorRdfDereferenceHttpParse);
      expect(new (<any> ActorRdfDereferenceHttpParse)(
        { name: 'actor', bus, mediatorHttp, mediatorRdfParse, mediaMappings }))
        .toBeInstanceOf(ActorRdfDereference);
    });

    it('should not be able to create new ActorRdfDereferenceHttpParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferenceHttpParse)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferenceHttpParse instance', () => {
    let actor: ActorRdfDereferenceHttpParse;

    beforeEach(() => {
      mediatorRdfParse.mediate = (action) => {
        if (action.mediaTypes) {
          return { mediaTypes: { a: 1.0 }};
        } else {
          return { handle: { quads: 'fine', triples: true }};
        }
      };
      mediatorHttp.mediate = (action) => {
        const status: number = action.input.startsWith('https://www.google.com/') ? 200 : 400;
        const extension = action.input.lastIndexOf('.') > action.input.lastIndexOf('/');
        let url = 'https://www.google.com/index.html';
        if (extension) {
          url = action.input === 'https://www.google.com/rel.txt' ? 'relative' : action.input;
        }
        if (action.init.method) {
          url = 'https://www.google.com/' + action.init.method + '.html';
        }
        if (action.init.headers.has('SomeKey')) {
          url = 'https://www.google.com/' + action.init.headers.get('SomeKey') + '.html';
        }
        const headers = new Headers();
        if (!extension) {
          headers.set('content-type', 'a; charset=utf-8');
        }
        return {
          body: action.input === 'https://www.google.com/noweb'
          ? require('node-web-streams').toWebReadableStream(new PassThrough()) : new PassThrough(),
          headers,
          status,
          url,
        };
      };
      actor = new ActorRdfDereferenceHttpParse({
        bus,
        mediaMappings,
        mediatorHttp,
        mediatorRdfParseHandle: mediatorRdfParse,
        mediatorRdfParseMediatypes: mediatorRdfParse,
        name: 'actor',
      });
    });

    it('should test on https', () => {
      return expect(actor.test({ url: 'https://www.google.com/' })).resolves.toBeTruthy();
    });

    it('should test on http', () => {
      return expect(actor.test({ url: 'http://www.google.com/' })).resolves.toBeTruthy();
    });

    it('should not test on ftp', () => {
      return expect(actor.test({ url: 'ftp://www.google.com/' })).rejects.toBeTruthy();
    });

    it('should stringify empty media types to any', () => {
      return expect(actor.mediaTypesToAcceptString({}, 100)).toEqual('*/*');
    });

    it('should stringify a single media type', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0 }, 100)).toEqual('a');
    });

    it('should stringify a single prioritized media type', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 0.5 }, 100)).toEqual('a;q=0.5');
    });

    it('should stringify three media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 1.0, c: 1.0 }, 100)).toEqual('a,b,c');
    });

    it('should stringify three prioritized media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.8, c: 0.2 }, 100))
        .toEqual('a,b;q=0.8,c;q=0.2');
    });

    it('should only allow 3 digits after decimal point', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.811111111, c: 0.2111111111 }, 100))
        .toEqual('a,b;q=0.811,c;q=0.211');
    });

    it('should sort by decreasing priorities', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 0.2, b: 1.0, c: 0.8 }, 100))
        .toEqual('b,c;q=0.8,a;q=0.2');
    });

    it('should cut off media types when too long', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.8, c: 0.2 }, 23))
        .toEqual('a,b;q=0.8,*/*;q=0.1');
    });

    it('should cut off media types when too long at edge (1)', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.8, c: 0.2 }, 19))
        .toEqual('a,b;q=0.8,*/*;q=0.1');
    });

    it('should cut off media types when too long at edge (2)', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.8, c: 0.2 }, 20))
        .toEqual('a,b;q=0.8,*/*;q=0.1');
    });

    it('should run with a web stream', () => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      return expect(actor.run({ url: 'https://www.google.com/' })).resolves
        .toMatchObject({ url: 'https://www.google.com/index.html', quads: 'fine', triples: true, headers });
    });

    it('should run with a web stream with a known extension', () => {
      const headers = {};
      return expect(actor.run({ url: 'https://www.google.com/abc.x' })).resolves
        .toMatchObject({ url: 'https://www.google.com/abc.x', quads: 'fine', triples: true, headers });
    });

    it('should run with a web stream with a known extension', () => {
      const headers = {};
      return expect(actor.run({ url: 'https://www.google.com/abc.y' })).resolves
        .toMatchObject({ url: 'https://www.google.com/abc.y', quads: 'fine', triples: true, headers });
    });

    it('should run with a web stream with a relative response URL', () => {
      const headers = {};
      return expect(actor.run({ url: 'https://www.google.com/rel.txt' })).resolves
        .toMatchObject({ url: 'https://www.google.com/relative', quads: 'fine', triples: true, headers });
    });

    it('should run with a Node.JS stream', () => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      return expect(actor.run({ url: 'https://www.google.com/noweb' })).resolves
        .toMatchObject({ url: 'https://www.google.com/index.html', quads: 'fine', triples: true, headers });
    });

    it('should not run on a 404', () => {
      return expect(actor.run({ url: 'https://www.nogoogle.com/notfound' })).rejects.toBeTruthy();
    });

    it('should run with another method', () => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      return expect(actor.run({ url: 'https://www.google.com/', method: 'PUT' })).resolves
        .toMatchObject({ url: 'https://www.google.com/PUT.html', quads: 'fine', triples: true, headers });
    });

    it('should run with custom headers', () => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      return expect(actor.run({ url: 'https://www.google.com/', headers: { SomeKey: 'V' } })).resolves
        .toMatchObject({ url: 'https://www.google.com/V.html', quads: 'fine', triples: true, headers });
    });
  });
});
