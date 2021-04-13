import { ActorHttp } from '@comunica/bus-http';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationPatchSparqlUpdate } from '../lib/QuadDestinationPatchSparqlUpdate';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

describe('QuadDestinationPatchSparqlUpdate', () => {
  let context: ActionContext;
  let url: string;
  let mediatorHttp: any;
  let mediatorRdfSerialize: any;
  let destination: QuadDestinationPatchSparqlUpdate;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
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
    destination = new QuadDestinationPatchSparqlUpdate(url, context, mediatorHttp, mediatorRdfSerialize);
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
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual('INSERT DATA {TRIPLES}');
    });

    it('should throw on a server error', async() => {
      mediatorHttp.mediate = () => ({ status: 400 });
      await expect(destination.insert(<any> 'QUADS')).rejects
        .toThrow('Could not retrieve abc (400: unknown error)');
    });

    it('should close body if available', async() => {
      const cancel = jest.fn();
      mediatorHttp.mediate = () => ({
        status: 200,
        body: { cancel },
      });
      await destination.insert(<any> 'QUADS');
      expect(cancel).toHaveBeenCalled();
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
          headers: new Headers({ 'content-type': 'application/sparql-update' }),
          method: 'PATCH',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual('DELETE DATA {TRIPLES}');
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
