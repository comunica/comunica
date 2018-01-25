
import {ActorHttp} from "@comunica/bus-http";
import {Bus} from "@comunica/core";
import "isomorphic-fetch";
import {Readable} from "stream";
import * as zlib from "zlib";
import {ActorHttpFollowRedirects} from "../lib/ActorHttpFollowRedirects";

const arrayifyStream = require('arrayify-stream');
const mockSetup = require('./__mocks__/follow-redirects').mockSetup;

describe('ActorHttpFollowRedirects', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHttpFollowRedirects module', () => {
    it('should be a function', () => {
      expect(ActorHttpFollowRedirects).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpFollowRedirects constructor', () => {
      expect(new (<any> ActorHttpFollowRedirects)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpFollowRedirects);
      expect(new (<any> ActorHttpFollowRedirects)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpFollowRedirects objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpFollowRedirects)(); }).toThrow();
    });
  });

  describe('An ActorHttpFollowRedirects instance', () => {
    let actor: ActorHttpFollowRedirects;

    beforeEach(() => {
      actor = new ActorHttpFollowRedirects({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ input: new Request('https://www.google.com/')})).resolves.toEqual({ time: Infinity });
    });

    it('should run', () => {
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
  });
});
