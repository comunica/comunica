import { ActorHttp } from '@comunica/bus-http';
import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Headers } from 'cross-fetch';
import { DataFactory } from 'rdf-data-factory';
import { QuadDestinationPutLdp } from '../lib/QuadDestinationPutLdp';

const DF = new DataFactory();
const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

describe('QuadDestinationPutLdp', () => {
  let context: IActionContext;
  let mediaTypes: string[];
  let url: string;
  let mediatorHttp: any;
  let mediatorRdfSerializeMediatypes: any;
  let mediatorRdfSerialize: any;
  let destination: QuadDestinationPutLdp;

  beforeEach(() => {
    mediatorHttp = {
      mediate: jest.fn(() => ({
        status: 200,
      })),
    };
    mediatorRdfSerializeMediatypes = {
      mediate: jest.fn(() => ({
        mediaTypes: {
          'text/turtle': 0.5,
          'application/ld+json': 0.7,
          'application/trig': 0.9,
        },
      })),
    };
    mediatorRdfSerialize = {
      mediate: jest.fn(() => ({
        handle: {
          data: streamifyString(`TRIPLES`),
        },
      })),
    };
    context = new ActionContext({ [KeysRdfUpdateQuads.destination.name]: 'abc' });
    mediaTypes = [ 'text/turtle', 'application/ld+json' ];
    url = 'abc';
    destination = new QuadDestinationPutLdp(
      url,
      context,
      mediaTypes,
      mediatorHttp,
      mediatorRdfSerializeMediatypes,
      mediatorRdfSerialize,
    );
  });

  describe('insert', () => {
    it('should handle a valid insert', async() => {
      await destination.insert(<any> 'QUADS');

      expect(mediatorRdfSerializeMediatypes.mediate).toHaveBeenCalledWith({
        context,
        mediaTypes: true,
      });

      expect(mediatorRdfSerialize.mediate).toHaveBeenCalledWith({
        context,
        handle: { context, quadStream: 'QUADS' },
        handleMediaType: 'text/turtle',
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'text/turtle' }),
          method: 'PUT',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual('TRIPLES');
    });

    it('should handle a valid insert when the server does not provide any suggestions', async() => {
      mediaTypes = [];
      destination = new QuadDestinationPutLdp(
        url,
        context,
        mediaTypes,
        mediatorHttp,
        mediatorRdfSerializeMediatypes,
        mediatorRdfSerialize,
      );

      await destination.insert(<any> 'QUADS');

      expect(mediatorRdfSerializeMediatypes.mediate).toHaveBeenCalledWith({
        context,
        mediaTypes: true,
      });

      expect(mediatorRdfSerialize.mediate).toHaveBeenCalledWith({
        context,
        handle: { context, quadStream: 'QUADS' },
        handleMediaType: 'application/trig',
      });

      expect(mediatorHttp.mediate).toHaveBeenCalledWith({
        context,
        init: {
          headers: new Headers({ 'content-type': 'application/trig' }),
          method: 'PUT',
          body: expect.anything(),
        },
        input: 'abc',
      });
      expect(await stringifyStream(ActorHttp.toNodeReadable(mediatorHttp.mediate.mock.calls[0][0].init.body)))
        .toEqual('TRIPLES');
    });

    it('should throw on a server error', async() => {
      mediatorHttp.mediate = () => ({ status: 400 });
      await expect(destination.insert(<any> 'QUADS')).rejects
        .toThrow('Could not update abc (HTTP status 400):\nempty response');
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
    it('should always throw', async() => {
      await expect(destination.delete(<any> 'QUADS'))
        .rejects.toThrow(`Put-based LDP destinations don't support deletions`);
    });
  });

  describe('deleteGraphs', () => {
    it('should always throw', async() => {
      await expect(destination.deleteGraphs('ALL', true, true))
        .rejects.toThrow(`Put-based LDP destinations don't support named graphs`);
    });
  });

  describe('createGraph', () => {
    it('should always throw', async() => {
      await expect(destination.createGraphs([ DF.namedNode('a') ], true))
        .rejects.toThrow(`Put-based LDP destinations don't support named graphs`);
    });
  });
});
