import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationSparql } from '../lib/QuadDestinationSparql';

const DF = new DataFactory();
const streamifyString = require('streamify-string');

describe('QuadDestinationSparql', () => {
  let context: ActionContext;
  let url: string;
  let mediatorHttp: any;
  let mediatorRdfSerialize: any;
  let destination: QuadDestinationSparql;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
        body: streamifyString(`RESPONSE`),
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        ok: true,
      })),
    };
    mediatorRdfSerialize = {
      mediate: jest.fn(() => ({
        handle: {
          data: streamifyString(`TRIPLES`),
        },
      })),
    };
    context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
    url = 'abc';
    destination = new QuadDestinationSparql(url, context, mediatorHttp, mediatorRdfSerialize);
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.insert(<any> 'QUADS');

      expect(mediatorRdfSerialize.mediate).toHaveBeenCalledWith({
        handle: { quadStream: 'QUADS' },
        handleMediaType: 'text/turtle',
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'INSERT DATA {TRIPLES}',
        },
        input: 'abc',
      });
    });

    it('should throw on a server error', async() => {
      mediatorHttp.mediate = () => ({
        status: 400,
        body: streamifyString(`ERROR`),
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        ok: false,
      });
      await expect(destination.insert(<any> 'QUADS')).rejects
        .toThrow('Invalid SPARQL endpoint (abc) response: undefined');
    });
  });

  describe('delete', () => {
    it('should handle a valid delete', async() => {
      await destination.delete(<any> 'QUADS');

      expect(mediatorRdfSerialize.mediate).toHaveBeenCalledWith({
        handle: { quadStream: 'QUADS' },
        handleMediaType: 'text/turtle',
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DELETE DATA {TRIPLES}',
        },
        input: 'abc',
      });
    });
  });

  describe('deleteGraphs', () => {
    it('should delete the default graph', async() => {
      await destination.deleteGraphs(DF.defaultGraph(), true, true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DROP DEFAULT',
        },
        input: 'abc',
      });
    });

    it('should delete named graphs', async() => {
      await destination.deleteGraphs('NAMED', true, true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DROP NAMED',
        },
        input: 'abc',
      });
    });

    it('should delete all graphs', async() => {
      await destination.deleteGraphs('ALL', true, true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DROP ALL',
        },
        input: 'abc',
      });
    });

    it('should delete specific graphs', async() => {
      await destination.deleteGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], true, true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DROP GRAPH <g:1>; DROP GRAPH <g:2>',
        },
        input: 'abc',
      });
    });

    it('should delete specific graphs in silent mode', async() => {
      await destination.deleteGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], false, true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'DROP SILENT GRAPH <g:1>; DROP SILENT GRAPH <g:2>',
        },
        input: 'abc',
      });
    });

    it('should clear specific graphs', async() => {
      await destination.deleteGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], true, false);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'CLEAR GRAPH <g:1>; CLEAR GRAPH <g:2>',
        },
        input: 'abc',
      });
    });

    it('should clear specific graphs in silent mode', async() => {
      await destination.deleteGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], false, false);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'CLEAR SILENT GRAPH <g:1>; CLEAR SILENT GRAPH <g:2>',
        },
        input: 'abc',
      });
    });
  });

  describe('createGraphs', () => {
    it('should create specific graphs', async() => {
      await destination.createGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], true);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'CREATE GRAPH <g:1>; CREATE GRAPH <g:2>',
        },
        input: 'abc',
      });
    });

    it('should create specific graphs in silent mode', async() => {
      await destination.createGraphs([ DF.namedNode('g:1'), DF.namedNode('g:2') ], false);

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: 'CREATE SILENT GRAPH <g:1>; CREATE SILENT GRAPH <g:2>',
        },
        input: 'abc',
      });
    });
  });
});
