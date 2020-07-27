import minimist = require('minimist');
// @ts-ignore
import { newEngineDynamic } from '../__mocks__';
// @ts-ignore
import { fs } from '../__mocks__/fs';
// @ts-ignore
import { http, ServerResponseMock } from '../__mocks__/http';
// @ts-ignore
import { parse } from '../__mocks__/url';
import { HttpServiceSparqlEndpoint } from '../lib/HttpServiceSparqlEndpoint';
const quad = require('rdf-quad');
const stringToStream = require('streamify-string');

jest.mock('..', () => {
  return {
    newEngineDynamic,
  };
});

jest.mock('url', () => {
  return {
    parse,
  };
});

jest.mock('http', () => {
  return http;
});

jest.mock('fs', () => {
  return fs;
});

const variantsDefault = [{ type: 'application/json', quality: 1 },
  { type: 'simple', quality: 1 },
  { type: 'application/sparql-results+json', quality: 1 },
  { type: 'application/sparql-results+xml', quality: 1 },
  { type: 'table', quality: 1 },
  { type: 'tree', quality: 0.9 },
  { type: 'stats', quality: 1 },
  { type: 'application/trig', quality: 1 },
  { type: 'application/n-quads', quality: 0.7 },
  { type: 'text/turtle', quality: 0.6 },
  { type: 'application/n-triples', quality: 0.3 },
  { type: 'text/n3', quality: 0.2 },
  { type: 'application/ld+json', quality: 0.9 }];

describe('content negotiation', () => {
  let instance: any;
  let request: any;
  let response: any;
  let variants: any;

  beforeEach(async() => {
    instance = new HttpServiceSparqlEndpoint({});
    instance.writeQueryResult = jest.fn();
    request = makeRequest();
    response = new ServerResponseMock();
  });

  function makeRequest() {
    request = stringToStream('default_test_request_content');
    request.url = 'url_sparql';
    request.headers = { 'content-type': 'contenttypewhichdefinitelydoesnotexist',
      accept: 'application/json,application/trig,simple,stats' };
    request.method = 'GET';
    return request;
  }

  it('should return a null mediatype when given */* accept header'
    , async() => {
      request.url = 'url_undefined_query';
      request.headers = { 'content-type': 'contenttypewhichdefinitelydoesnotexist',
        accept: '*/*' };
      expect(instance.determineMediaType(request, variants)).toEqual(null);
    });

  it('should return a null mediatype when no accept header'
    , async() => {
      request.url = 'url_undefined_query';
      request.headers = { 'content-type': 'contenttypewhichdefinitelydoesnotexist' };
      expect(instance.determineMediaType(request, variants)).toEqual(null);
    });

  it('should choose default mediatype if it is present in accept', async() => {
    request.headers = { accept: 'application/json,application/trig,simple,stats' };
    instance.parseBody = jest.fn(() => Promise.resolve('test_result'));
    request.method = 'POST';
    expect(instance.determineMediaType(request, variantsDefault)).toEqual('application/json');
  });

  it('should choose second preferred mediatype if it is present in accept', async() => {
    request.headers = { accept: 'application/trig,simple,stats' };
    instance.parseBody = jest.fn(() => Promise.resolve('test_result'));
    request.method = 'POST';
    expect(instance.determineMediaType(request, variantsDefault)).toEqual('simple');
  });

  it('should choose the next preferred variant available in accept', async() => {
    request.headers = { accept: 'application/trig,stats' };
    instance.parseBody = jest.fn(() => Promise.resolve('test_result'));
    request.method = 'POST';
    expect(instance.determineMediaType(request, variantsDefault)).toEqual('stats');
  });
});
