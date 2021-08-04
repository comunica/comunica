import { ActorHttp } from '@comunica/bus-http';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');

describe('QuadDestinationPatchSparqlUpdate', () => {
  let context: ActionContext;
  let url: string;
  let mediatorHttp: any;
  let destination: QuadDestinationPatchSparqlUpdate;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
      })),
    };
    context = ActionContext({ [KeysRdfUpdateQuads.destination]: 'abc' });
    url = 'abc';
    destination = new QuadDestinationPatchSparqlUpdate(url, context, mediatorHttp);
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
      await expect(destination.insert(new ArrayIterator([]))).rejects
        .toThrow('Could not retrieve abc (400: unknown error)');
    });

    it('should close body if available', async() => {
      const cancel = jest.fn();
      mediatorHttp.mediate = () => ({
        status: 200,
        body: { cancel },
      });
      await destination.insert(new ArrayIterator([]));
      expect(cancel).toHaveBeenCalled();
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
