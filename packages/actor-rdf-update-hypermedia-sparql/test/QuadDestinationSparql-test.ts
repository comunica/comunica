/* eslint-disable jest/prefer-spy-on */
import { Readable } from 'node:stream';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationSparql } from '../lib/QuadDestinationSparql';

const DF = new DataFactory();

describe('QuadDestinationSparql', () => {
  let context: IActionContext;
  let url: string;
  let mediatorHttp: any;
  let destination: QuadDestinationSparql;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => {
        const body = Readable.from([ `RESPONSE` ]);
        (<any>body).cancel = jest.fn();
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
    destination = new QuadDestinationSparql(url, context, mediatorHttp, DF, false);
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.update({
        insert: new ArrayIterator([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

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

    it('should handle a valid insert with quoted triples', async() => {
      await destination.update({
        insert: new ArrayIterator([
          DF.quad(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          ),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: `INSERT DATA {
  <ex:s1> <ex:p1> <<<ex:s1> <ex:p1> <ex:o1>>> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`,
          signal: expect.anything(),
        },
        input: 'abc',
      });
    });

    it('should throw on a server error', async() => {
      const body = Readable.from([ `ERROR` ]);
      mediatorHttp.mediate = () => ({
        status: 400,
        body,
        headers: new Headers({ 'Content-Type': 'application/sparql-results+json' }),
        ok: false,
      });
      (<any>body).cancel = jest.fn();
      await expect(destination.update({ insert: new ArrayIterator<RDF.Quad>([]) })).rejects
        .toThrow(`Invalid SPARQL endpoint response from abc (HTTP status 400):\nempty response`);
    });
  });

  describe('delete', () => {
    it('should handle a valid delete', async() => {
      await destination.update({
        delete: new ArrayIterator([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
      });

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

  describe('update', () => {
    it('should handle a valid update', async() => {
      await destination.update({
        insert: new ArrayIterator([
          DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
        ]),
        delete: new ArrayIterator([
          DF.quad(DF.namedNode('ex:sd1'), DF.namedNode('ex:pd1'), DF.namedNode('ex:od1')),
          DF.quad(DF.namedNode('ex:sd2'), DF.namedNode('ex:pd2'), DF.namedNode('ex:od2'), DF.namedNode('ex:gd2')),
        ]),
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: { 'content-type': 'application/sparql-update' },
          method: 'POST',
          body: `DELETE DATA {
  <ex:sd1> <ex:pd1> <ex:od1> .
  GRAPH <ex:gd2> { <ex:sd2> <ex:pd2> <ex:od2> . }
} ;
INSERT DATA {
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
