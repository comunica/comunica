import { PassThrough, Readable } from 'stream';
import { ActorRdfDereference } from '@comunica/bus-rdf-dereference';
import { KeysCore, KeysInitSparql } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import { MediatorRace } from '@comunica/mediator-race';
import 'cross-fetch/polyfill';
import { ActorRdfDereferenceHttpParse } from '../lib/ActorRdfDereferenceHttpParse';
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfDereferenceHttpParse', () => {
  let bus: any;
  let mediatorHttp: any;
  let mediatorRdfParse: any;
  let mediaMappings: any;

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
        { name: 'actor', bus, mediatorHttp, mediatorRdfParse, mediaMappings },
      ))
        .toBeInstanceOf(ActorRdfDereferenceHttpParse);
      expect(new (<any> ActorRdfDereferenceHttpParse)(
        { name: 'actor', bus, mediatorHttp, mediatorRdfParse, mediaMappings },
      ))
        .toBeInstanceOf(ActorRdfDereference);
    });

    it('should not be able to create new ActorRdfDereferenceHttpParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfDereferenceHttpParse)(); }).toThrow();
    });
  });

  describe('An ActorRdfDereferenceHttpParse instance', () => {
    let actor: ActorRdfDereferenceHttpParse;

    beforeEach(() => {
      mediatorRdfParse.mediate = (action: any) => {
        if (action.mediaTypes) {
          return { mediaTypes: { a: 1 }};
        }
        const quads = new Readable();
        if (action.context && action.context.has('emitParseError')) {
          quads._read = () => {
            quads.emit('error', new Error('Parse error'));
          };
          return { handle: { quads, triples: true }};
        } if (action.context && action.context.has('parseReject')) {
          return Promise.reject(new Error('Parse reject error'));
        }
        quads._read = () => {
          action.handle.input.read(1);
          quads.push(null);
        };
        action.handle.input.on('error', (error: Error) => quads.emit('error', error));
        return { handle: { quads, triples: true }};
      };
      mediatorHttp.mediate = (action: any) => {
        if (action.context && action.context.has('httpReject')) {
          return Promise.reject(new Error('Http reject error'));
        }
        if (action.input.includes('error')) {
          const body = new Readable();
          body._read = () => {
            body.emit('error', new Error('Body stream error'));
          };
          return {
            body,
            headers: new Headers(),
            status: 200,
            url: action.input,
          };
        }

        const status: number = action.input.startsWith('https://www.google.com/') ? 200 : 400;
        const extension = action.input.lastIndexOf('.') > action.input.lastIndexOf('/');
        let url = 'https://www.google.com/index.html';
        if (extension) {
          url = action.input === 'https://www.google.com/rel.txt' ? 'relative' : action.input;
        }
        if (action.init.method) {
          url = `https://www.google.com/${action.init.method}.html`;
        }
        if (action.init.headers.has('SomeKey')) {
          url = `https://www.google.com/${action.init.headers.get('SomeKey')}.html`;
        }
        const headers = new Headers();
        if (!extension) {
          headers.set('content-type', 'a; charset=utf-8');
        }
        if (action.input.includes('emptycontenttype')) {
          headers.set('content-type', '');
        }
        if (action.input.includes('missingcontenttype')) {
          headers.delete('content-type');
        }
        let body = action.input === 'https://www.google.com/noweb' ?
          require('web-streams-node').toWebReadableStream(new PassThrough()) :
          new PassThrough();
        body.cancel = jest.fn();
        if (action.input.includes('nobody')) {
          body = undefined;
        }
        return {
          body,
          headers,
          status,
          url,
        };
      };
      actor = new ActorRdfDereferenceHttpParse({
        bus,
        maxAcceptHeaderLength: 127,
        maxAcceptHeaderLengthBrowser: 127,
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
      return expect(actor.mediaTypesToAcceptString({ a: 1 }, 100)).toEqual('a');
    });

    it('should stringify a single prioritized media type', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 0.5 }, 100)).toEqual('a;q=0.5');
    });

    it('should stringify three media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1, b: 1, c: 1 }, 100)).toEqual('a,b,c');
    });

    it('should stringify three prioritized media types', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1, b: 0.8, c: 0.2 }, 100))
        .toEqual('a,b;q=0.8,c;q=0.2');
    });

    it('should only allow 3 digits after decimal point', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1, b: 0.811_111_111, c: 0.211_111_111_1 }, 100))
        .toEqual('a,b;q=0.811,c;q=0.211');
    });

    it('should sort by decreasing priorities', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 0.2, b: 1, c: 0.8 }, 100))
        .toEqual('b,c;q=0.8,a;q=0.2');
    });

    it('should cut as much as needed for a wildcard (1)', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1, b: 0.8, cdef: 0.2 }, 19))
        .toEqual('a,b;q=0.8,*/*;q=0.1');
    });

    it('should cut as much as needed for a wildcard (2)', () => {
      return expect(actor.mediaTypesToAcceptString({ a: 1, b: 0.8, cd: 0.2, f: 0.1 }, 19))
        .toEqual('a,b;q=0.8,*/*;q=0.1');
    });

    it('should cut as much as needed for a wildcard (3)', () => {
      return expect(actor.mediaTypesToAcceptString({ abcdef: 1, ef: 1 }, 6))
        .toEqual('*/*;q=0.1');
    });

    it('should not cut off incorrectly at the maxAcceptHeaderLength boundary', () => {
      const maxHeaderLength = actor.maxAcceptHeaderLength;
      // Subtract 6 for ';q=0.8'
      const typeLength = Math.ceil((maxHeaderLength - 6) / 2);
      const a = new Array(typeLength).join('a');
      const b = new Array(typeLength).join('b');
      return expect(actor.mediaTypesToAcceptString({ [a]: 1, [b]: 0.8 }, maxHeaderLength))
        .toEqual(`${a},${b};q=0.8`);
    });

    it('should run with a web stream', async() => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      const output = await actor.run({ url: 'https://www.google.com/' });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a web stream with a known extension', async() => {
      const headers = {};
      const output = await actor.run({ url: 'https://www.google.com/abc.x' });
      expect(output.url).toEqual('https://www.google.com/abc.x');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with an empty content type', async() => {
      const headers = {
        'content-type': '',
      };
      const output = await actor.run({ url: 'https://www.google.com/emptycontenttype' });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a missing content type', async() => {
      const headers = {};
      const output = await actor.run({ url: 'https://www.google.com/missingcontenttype' });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a web stream with another known extension', async() => {
      const headers = {};
      const output = await actor.run({ url: 'https://www.google.com/abc.y' });
      expect(output.url).toEqual('https://www.google.com/abc.y');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a web stream with a relative response URL', async() => {
      const headers = {};
      const output = await actor.run({ url: 'https://www.google.com/rel.txt' });
      expect(output.url).toEqual('https://www.google.com/relative');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a Node.JS stream', async() => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      const output = await actor.run({ url: 'https://www.google.com/noweb' });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should not run on a 404', () => {
      return expect(actor.run({ url: 'https://www.nogoogle.com/notfound' })).rejects
        .toThrow(new Error('Could not retrieve https://www.nogoogle.com/notfound (400: unknown error)'));
    });

    it('should not run on a 404 without a body', () => {
      return expect(actor.run({ url: 'https://www.nogoogle.com/nobody' })).rejects
        .toThrow(new Error('Could not retrieve https://www.nogoogle.com/nobody (400: unknown error)'));
    });

    it('should run on a 404 in lenient mode', async() => {
      const context = ActionContext({ [KeysInitSparql.lenient]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.nogoogle.com/notfound', context });
      expect(output.url).toEqual('https://www.nogoogle.com/notfound');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run with another method', async() => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      const output = await actor.run({ url: 'https://www.google.com/', method: 'PUT' });
      expect(output.url).toEqual('https://www.google.com/PUT.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with custom headers', async() => {
      const headers = {
        'content-type': 'a; charset=utf-8',
      };
      const output = await actor.run({ url: 'https://www.google.com/', headers: { SomeKey: 'V' }});
      expect(output.url).toEqual('https://www.google.com/V.html');
      expect(output.triples).toEqual(true);
      expect(output.headers).toEqual(headers);
      expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run and receive stream errors', async() => {
      const output = await actor.run({ url: 'https://www.google.com/error' });
      expect(output.url).toEqual('https://www.google.com/error');
      await expect(arrayifyStream(output.quads)).rejects.toThrow(new Error('Body stream error'));
    });

    it('should run and ignore stream errors in lenient mode', async() => {
      const context = ActionContext({ [KeysInitSparql.lenient]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.google.com/error', context });
      expect(output.url).toEqual('https://www.google.com/error');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run and receive parse errors', async() => {
      const context = ActionContext({ emitParseError: true });
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      await expect(arrayifyStream(output.quads)).rejects.toThrow(new Error('Parse error'));
    });

    it('should run and ignore parse errors in lenient mode', async() => {
      const context = ActionContext({ emitParseError: true, [KeysInitSparql.lenient]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run and ignore parse errors in lenient mode and log them', async() => {
      const logger = new LoggerVoid();
      const spy = spyOn(logger, 'error');
      const context = ActionContext({ emitParseError: true, [KeysInitSparql.lenient]: true, [KeysCore.log]: logger });
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledWith('Parse error', {
        actor: 'actor',
        url: 'https://www.google.com/',
      });
    });

    it('should not run on http rejects', () => {
      const context = ActionContext({ httpReject: true });
      return expect(actor.run({ url: 'https://www.google.com/', context }))
        .rejects.toThrow(new Error('Http reject error'));
    });

    it('should run and ignore http rejects in lenient mode', async() => {
      const context = ActionContext({ httpReject: true, [KeysInitSparql.lenient]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run and ignore http rejects in lenient mode and log them', async() => {
      const logger = new LoggerVoid();
      const spy = spyOn(logger, 'error');
      const context = ActionContext({ httpReject: true, [KeysInitSparql.lenient]: true, [KeysCore.log]: logger });
      await actor.run({ url: 'https://www.google.com/', context });
      expect(spy).toHaveBeenCalledWith('Http reject error', {
        actor: 'actor',
      });
    });

    it('should not run on parse rejects', () => {
      const context = ActionContext({ parseReject: true });
      return expect(actor.run({ url: 'https://www.google.com/', context }))
        .rejects.toThrow(new Error('Parse reject error'));
    });

    it('should run and ignore parse rejects in lenient mode', async() => {
      const context = ActionContext({ parseReject: true, [KeysInitSparql.lenient]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/');
      expect(await arrayifyStream(output.quads)).toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run and ignore parse rejects in lenient mode and log them', async() => {
      const logger = new LoggerVoid();
      const spy = spyOn(logger, 'error');
      const context = ActionContext({ parseReject: true, [KeysInitSparql.lenient]: true, [KeysCore.log]: logger });
      await actor.run({ url: 'https://www.google.com/', context });
      expect(spy).toHaveBeenCalledWith('Parse reject error', {
        actor: 'actor',
      });
    });
  });
});
