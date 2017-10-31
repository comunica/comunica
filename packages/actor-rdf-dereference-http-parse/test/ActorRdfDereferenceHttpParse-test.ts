import {ActorRdfDereference} from "@comunica/bus-rdf-dereference";
import {Bus} from "@comunica/core";
import {MediatorRace} from "@comunica/mediator-race";
import {ActorRdfDereferenceHttpParse} from "../lib/ActorRdfDereferenceHttpParse";

describe('ActorRdfDereferenceHttpParse', () => {
  let bus;
  let mediatorHttp;
  let mediatorRdfParse;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = new MediatorRace({ name: 'mediator-http', bus: new Bus({ name: 'bus-http' }) });
    mediatorRdfParse = new MediatorRace({ name: 'mediator-parse', bus: new Bus({ name: 'bus-parse' }) });
  });

  describe('The ActorRdfDereferenceHttpParse module', () => {
    it('should be a function', () => {
      expect(ActorRdfDereferenceHttpParse).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfDereferenceHttpParse constructor', () => {
      expect(new (<any> ActorRdfDereferenceHttpParse)({ name: 'actor', bus, mediatorHttp, mediatorRdfParse }))
        .toBeInstanceOf(ActorRdfDereferenceHttpParse);
      expect(new (<any> ActorRdfDereferenceHttpParse)({ name: 'actor', bus, mediatorHttp, mediatorRdfParse }))
        .toBeInstanceOf(ActorRdfDereference);
    });

    it('should not be able to create new ActorRdfDereferenceHttpParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferenceHttpParse)(); }).toThrow();
    });

    it('should throw an error when constructed without a http mediator', () => {
      expect(() => { new (<any> ActorRdfDereferenceHttpParse)({ name: 'actor', bus, mediatorRdfParse }); }).toThrow();
    });

    it('should throw an error when constructed without a parse mediator', () => {
      expect(() => { new (<any> ActorRdfDereferenceHttpParse)({ name: 'actor', bus, mediatorHttp }); }).toThrow();
    });

    it('should throw an error when constructed without a http and parse mediator', () => {
      expect(() => { new (<any> ActorRdfDereferenceHttpParse)({ name: 'actor', bus }); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorRdfDereferenceHttpParse)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferenceHttpParse instance', () => {
    let actor: ActorRdfDereferenceHttpParse;

    beforeEach(() => {
      mediatorRdfParse.mediate = (action) => {
        if (action.mediaType) {
          return { mediaType: { mediaTypes: { a: 1.0 }}};
        } else {
          return { parse: { quads: 'fine', triples: true }};
        }
      };
      mediatorHttp.mediate = (action) => {
        const status: number = action.url === 'https://www.google.com/' ? 200 : 400;
        return {
          body: null,
          headers: {get: () => 'a; charset=utf-8'},
          status,
          url: 'https://www.google.com/index.html',
        };
      };
      actor = new ActorRdfDereferenceHttpParse({ name: 'actor', bus, mediatorHttp, mediatorRdfParse });
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
      return expect(actor.mediaTypesToAcceptString({})).toEqual('*/*');
    });

    it('should stringify a single media type', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0 })).toEqual('a');
    });

    it('should stringify a single prioritized media type', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 0.5 })).toEqual('a;q=0.5');
    });

    it('should stringify three media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 1.0, c: 1.0 })).toEqual('a, b, c');
    });

    it('should stringify three prioritized media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1.0, b: 0.8, c: 0.2 }))
        .toEqual('a, b;q=0.8, c;q=0.2');
    });

    it('should run', () => {
      return expect(actor.run({ url: 'https://www.google.com/' })).resolves
        .toMatchObject({ pageUrl: 'https://www.google.com/index.html', quads: 'fine', triples: true });
    });

    it('should not run on a 404', () => {
      return expect(actor.run({ url: 'https://www.google.com/notfound' })).rejects.toBeTruthy();
    });
  });
});
