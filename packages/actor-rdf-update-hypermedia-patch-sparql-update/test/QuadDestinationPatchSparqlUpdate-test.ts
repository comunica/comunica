import { ActorHttp } from '@comunica/bus-http';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { fromArray, wrap } from 'asynciterator';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');

describe('QuadDestinationPatchSparqlUpdate', () => {
  let context: IActionContext;
  let url: string;
  let mediatorHttp: any;
  let destination: QuadDestinationPatchSparqlUpdate;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
      })),
    };
    context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
    url = 'abc';
    destination = new QuadDestinationPatchSparqlUpdate(url, context, mediatorHttp);
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.insert(fromArray([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
      ]));

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual(`INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });

    it('should handle a valid Promisified insert', async() => {
      await destination.insert(wrap(Promise.resolve(fromArray([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
      ]))));

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual(`INSERT DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });

    it('should throw on a server error', async() => {
      mediatorHttp.mediate = () => ({ status: 400 });
      await expect(destination.insert(fromArray<RDF.Quad>([]))).rejects
        .toThrow('Could not update abc (HTTP status 400):\nempty response');
    });

    it('should close body if available', async() => {
      const cancel = jest.fn();
      mediatorHttp.mediate = () => ({
        status: 200,
        body: { cancel },
      });
      await destination.insert(fromArray<RDF.Quad>([]));
      expect(cancel).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should handle a valid delete', async() => {
      await destination.delete(fromArray<RDF.Quad>([
        DF.quad(DF.namedNode('ex:s1'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
        DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
      ]));

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual(`DELETE DATA {
  <ex:s1> <ex:p1> <ex:o1> .
  GRAPH <ex:g2> { <ex:s2> <ex:p2> <ex:o2> . }
}`);
    });
  });

  describe('deleteGraphs', () => {
    it('should always throw', async() => {
      await expect(destination.deleteGraphs('ALL', true, true))
        .rejects.toThrow(`Patch-based SPARQL Update destinations don't support named graphs`);
    });
  });

  describe('createGraph', () => {
    it('should always throw', async() => {
      await expect(destination.createGraphs([ DF.namedNode('a') ], true))
        .rejects.toThrow(`Patch-based SPARQL Update destinations don't support named graphs`);
    });
  });
});
