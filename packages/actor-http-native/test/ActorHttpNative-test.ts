
import {ActorHttp} from "@comunica/bus-http";
import {Bus} from "@comunica/core";
import {Setup} from "@comunica/runner";
import "isomorphic-fetch";
import {Readable} from "stream";
import * as url from "url";
import * as zlib from "zlib";
import {ActorHttpNative} from "../lib/ActorHttpNative";
import Requester from "../lib/Requester";

const arrayifyStream = require('arrayify-stream');
const mockSetup = require('./__mocks__/follow-redirects').mockSetup;

describe('ActorHttpNative', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHttpNative module', () => {
    it('should be a function', () => {
      expect(ActorHttpNative).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpNative constructor', () => {
      expect(new (<any> ActorHttpNative)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpNative);
      expect(new (<any> ActorHttpNative)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpNative objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpNative)(); }).toThrow();
    });
  });

  describe('An ActorHttpNative instance', () => {
    let actor: ActorHttpNative;

    beforeEach(() => {
      actor = new ActorHttpNative({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ input: new Request('https://www.google.com/')})).resolves.toEqual({ time: Infinity });
    });

    it('should run', () => {
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ input: new Request('http://example.com')})).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run https', () => {
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ input: new Request('https://example.com')})).resolves
        .toMatchObject({ status: 404 });
    });

    it('should run with agent options', () => {
      actor = new ActorHttpNative({ name: 'actor', bus, agentOptions: '{ "name": "007" }' });
      mockSetup({ statusCode: 404 });
      return expect(actor.run({ input: new Request('http://example.com')})).resolves
        .toMatchObject({ status: 404 });
    });

    it('can have headers', async () => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run(
        { input: new Request('http://example.com', { headers: new Headers({ a: 'b' }) })});
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input).toMatchObject({ headers: { a: 'b' }});
    });

    it('can have headers in the init object', async () => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ input: 'http://example.com', init: { headers: new Headers({ a: 'b' }) }});
      expect(result).toMatchObject({ status: 200 });
      expect(result.body.input).toMatchObject({ headers: { a: 'b' }});
    });

    it('can decode gzipped streams', async () => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'gzip' } });
      const result: any = await actor.run({ input: 'http://example.com' });
      expect(result).toMatchObject({ status: 200 });
      const output = await arrayifyStream(result.body);
      expect(output).toContain('apple');
    });

    it('errors on invalid encoding', () => {
      const body = new Readable();
      body.push(zlib.gzipSync('apple'));
      body.push(null);
      mockSetup({ statusCode: 200, body, headers: { 'content-encoding': 'invalid' } });
      return expect(actor.run({ input: new Request('http://example.com')})).rejects
        .toMatchObject(new Error('Unsupported encoding: invalid'));
    });

    it('can have headers in the init object', async () => {
      mockSetup({ statusCode: 200 });
      const result: any = await actor.run({ init: { headers: new Headers({ a: 'b' }), method: 'HEAD' },
        input: 'http://example.com'});
      expect(result).toMatchObject({ status: 200 });
    });
  });
});

describe('Requester', () => {
  it('also works with parsed URL objects', () => {
    mockSetup({ statusCode: 405 });
    const requester = new Requester();
    const req = requester.createRequest(url.parse('http://example.com/test'));
    return new Promise((resolve) => {
      req.on('response', (response) => {
        expect(response).toMatchObject({ statusCode: 405 });
        expect(response.input).toMatchObject({ href: 'http://example.com/test' });
        resolve();
      });
    });
  });
});
