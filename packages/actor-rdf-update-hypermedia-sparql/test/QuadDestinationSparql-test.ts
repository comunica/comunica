import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationSparql } from '../lib/QuadDestinationSparql';

const DF = new DataFactory();
const streamifyString = require('streamify-string');

describe('QuadDestinationSparql', () => {
  let context: IActionContext;
  let url: string;
  let mediatorHttp: any;
  let destination: QuadDestinationSparql;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => {
        const body = streamifyString(`RESPONSE`);
        body.cancel = jest.fn();
        return {
          status: 200,
          body,
          headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
          ok: true,
        };
      }),
    };
    context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
    url = 'abc';
    destination = new QuadDestinationSparql(url, context, mediatorHttp);
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.insert(new ArrayIterator([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
      ]));

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: `INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`,
          signal: expect.anything(),
        },
        input: 'abc',
      });
    });

    it('should throw on a server error', async() => {
      const body = streamifyString(`ERROR`);
      mediatorHttp.mediate = () => ({
        status: 400,
        body,
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        ok: false,
      });
      body.cancel = jest.fn();
      await expect(destination.insert(new ArrayIterator([]))).rejects
        .toThrow(`Invalid SPARQL endpoint response from abc (HTTP status 400):\nempty response`);
    });
  });

  describe('delete', () => {
    it('should handle a valid delete', async() => {
      await destination.delete(new ArrayIterator([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
      ]));

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: `DELETE DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`,
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
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
          signal: expect.anything(),
        },
        input: 'abc',
      });
    });
  });
});
