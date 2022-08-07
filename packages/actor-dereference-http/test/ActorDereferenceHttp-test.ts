import { Readable } from 'stream';
import { ActorDereference } from '@comunica/bus-dereference';
import { KeysCore, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerVoid } from '@comunica/logger-void';
import { MediatorRace } from '@comunica/mediator-race';
import 'cross-fetch/polyfill';
import type { IActionContext } from '@comunica/types';
import { ActorDereferenceHttp } from '../lib/ActorDereferenceHttp';

const streamifyString = require('streamify-string');

// TODO: Remove when targeting NodeJS 18+
global.ReadableStream = global.ReadableStream || require('web-streams-ponyfill').ReadableStream;

describe('ActorDereferenceHttp', () => {
  let bus: any;
  let mediatorHttp: any;
  let mediaMappings: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = new MediatorRace({ name: 'mediator-http', bus: new Bus({ name: 'bus-http' }) });
    mediaMappings = {
      x: 'y',
    };
    context = new ActionContext();
  });

  describe('The ActorDereferenceHttp module', () => {
    it('should be a function', () => {
      expect(ActorDereferenceHttp).toBeInstanceOf(Function);
    });

    it('should be a ActorDereferenceHttp constructor', () => {
      expect(new ActorDereferenceHttp(<any> { name: 'actor', bus, mediatorHttp }))
        .toBeInstanceOf(ActorDereferenceHttp);
      expect(new ActorDereferenceHttp(<any> { name: 'actor', bus, mediatorHttp }))
        .toBeInstanceOf(ActorDereference);
    });

    it('should be a ActorDereferenceHttp when media mappings are provided', () => {
      expect(new ActorDereferenceHttp(<any> { name: 'actor', bus, mediatorHttp, mediaMappings }))
        .toBeInstanceOf(ActorDereferenceHttp);
      expect(new ActorDereferenceHttp(<any> { name: 'actor', bus, mediatorHttp, mediaMappings }))
        .toBeInstanceOf(ActorDereference);
    });

    it('should not be able to create new ActorDereferenceHttp objects without \'new\'', () => {
      expect(() => { (<any> ActorDereferenceHttp)(); }).toThrow();
    });
  });

  describe('An ActorDereferenceHttp instance', () => {
    let actor: ActorDereferenceHttp;

    beforeEach(() => {
      mediatorHttp.mediate = (action: any) => {
        if (action.context.hasRaw('httpReject')) {
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
        if (action.input.includes('plaincontenttype')) {
          headers.set('content-type', 'text/plain');
        }
        if (action.input.includes('missingcontenttype')) {
          headers.delete('content-type');
        }
        const dummyBodyStream = streamifyString('DUMMY BODY');
        let body = action.input === 'https://www.google.com/noweb' ?
          require('readable-stream-node-to-web')(dummyBodyStream) :
          dummyBodyStream;
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
      actor = new ActorDereferenceHttp({
        bus,
        maxAcceptHeaderLength: 127,
        maxAcceptHeaderLengthBrowser: 127,
        mediatorHttp,
        name: 'actor',
      });
    });

    it('should test on https', () => {
      return expect(actor.test({ url: 'https://www.google.com/', context })).resolves.toBeTruthy();
    });

    it('should test on http', () => {
      return expect(actor.test({ url: 'http://www.google.com/', context })).resolves.toBeTruthy();
    });

    it('should not test on ftp', () => {
      return expect(actor.test({ url: 'ftp://www.google.com/', context })).rejects.toBeTruthy();
    });

    it('should run with a web stream', async() => {
      const headers = new Headers({
        'content-type': 'a; charset=utf-8',
      });
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.exists).toEqual(true);
      expect(output.headers).toEqual(headers);
      // Expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with a web stream with a known extension', async() => {
      const headers = new Headers({});
      const output = await actor.run({ url: 'https://www.google.com/abc.x', context });
      expect(output.url).toEqual('https://www.google.com/abc.x');
      expect(output.headers).toEqual(headers);
      // Expect(await arrayifyStream(output.quads)).toEqual([]);
    });

    it('should run with an empty content type', async() => {
      const headers = new Headers({
        'content-type': '',
      });
      const output = await actor.run({ url: 'https://www.google.com/emptycontenttype', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.headers).toEqual(headers);
      expect(output.mediaType).toEqual('');
    });

    it('should run with an text/plain content type', async() => {
      const headers = new Headers({
      });
      const output = await actor.run({ url: 'https://www.google.com/plaincontenttype', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.headers).toEqual(new Headers({ 'content-type': 'text/plain' }));
      expect(output.mediaType).toEqual(undefined);
    });

    it('should run with an empty content type and default to given content type', async() => {
      const headers = new Headers({
        'content-type': '',
      });
      const output = await actor.run({ url: 'https://www.google.com/emptycontenttype', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.headers).toEqual(headers);
    });

    it('should run with a missing content type', async() => {
      const headers = new Headers({});
      const output = await actor.run({ url: 'https://www.google.com/missingcontenttype', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.headers).toEqual(headers);
    });

    it('should run with a web stream with another known extension', async() => {
      const headers = new Headers({});
      const output = await actor.run({ url: 'https://www.google.com/abc.y', context });
      expect(output.url).toEqual('https://www.google.com/abc.y');
      expect(output.headers).toEqual(headers);
    });

    it('should run with a web stream with a relative response URL', async() => {
      const headers = new Headers({});
      const output = await actor.run({ url: 'https://www.google.com/rel.txt', context });
      expect(output.url).toEqual('https://www.google.com/relative');
      expect(output.headers).toEqual(headers);
    });

    it('should run with a Node.JS stream', async() => {
      const headers = new Headers({
        'content-type': 'a; charset=utf-8',
      });
      const output = await actor.run({ url: 'https://www.google.com/noweb', context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.headers).toEqual(headers);
    });

    it('should not run on a 404', () => {
      return expect(actor.run({ url: 'https://www.nogoogle.com/notfound', context })).rejects
        .toThrow(new Error('Could not retrieve https://www.nogoogle.com/notfound (HTTP status 400):\nDUMMY BODY'));
    });

    it('should not run on a 404 without a body', () => {
      return expect(actor.run({ url: 'https://www.nogoogle.com/nobody', context })).rejects
        .toThrow(new Error('Could not retrieve https://www.nogoogle.com/nobody (HTTP status 400):\nempty response'));
    });

    it('should run on a 404 when acceptErrors is true', async() => {
      const output = await actor.run({ url: 'https://www.nogoogle.com/notfound', acceptErrors: true, context });
      expect(output.url).toEqual('https://www.google.com/index.html');
      expect(output.exists).toEqual(false);
    });

    it('should run on a 404 in lenient mode', async() => {
      context = new ActionContext({ [KeysInitQuery.lenient.name]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.nogoogle.com/notfound', context });
      expect(output.url).toEqual('https://www.nogoogle.com/notfound');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run with another method', async() => {
      const headers = new Headers({
        'content-type': 'a; charset=utf-8',
      });
      const output = await actor.run({ url: 'https://www.google.com/', method: 'PUT', context });
      expect(output.url).toEqual('https://www.google.com/PUT.html');
      expect(output.headers).toEqual(headers);
    });

    it('should run with custom headers', async() => {
      const headers = new Headers({
        'content-type': 'a; charset=utf-8',
      });
      const output = await actor.run({
        url: 'https://www.google.com/',
        headers: new Headers({ SomeKey: 'V' }),
        context,
      });
      expect(output.url).toEqual('https://www.google.com/V.html');
      expect(output.headers).toEqual(headers);
    });

    it('should run and receive stream errors', async() => {
      const output = await actor.run({ url: 'https://www.google.com/error', context });
      expect(output.url).toEqual('https://www.google.com/error');
    });

    it('should not run on http rejects', () => {
      context = new ActionContext({ httpReject: true });
      return expect(actor.run({ url: 'https://www.google.com/', context }))
        .rejects.toThrow(new Error('Http reject error'));
    });

    it('should run and ignore http rejects in lenient mode', async() => {
      context = new ActionContext({ httpReject: true, [KeysInitQuery.lenient.name]: true });
      const spy = jest.spyOn(actor, <any> 'logError');
      const output = await actor.run({ url: 'https://www.google.com/', context });
      expect(output.url).toEqual('https://www.google.com/');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should run and ignore http rejects in lenient mode and log them', async() => {
      const logger = new LoggerVoid();
      const spy = jest.spyOn(logger, 'error');
      context = new ActionContext({
        httpReject: true,
        [KeysInitQuery.lenient.name]: true,
        [KeysCore.log.name]: logger,
      });
      await actor.run({ url: 'https://www.google.com/', context });
      expect(spy).toHaveBeenCalledWith('Http reject error', {
        actor: 'actor',
      });
    });
  });
});
