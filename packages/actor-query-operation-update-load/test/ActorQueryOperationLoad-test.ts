import { KeysInitQuery, KeysQueryOperation, KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationLoad } from '../lib/ActorQueryOperationLoad';

const DF = new DataFactory();

describe('ActorQueryOperationLoad', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorUpdateQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 1 }),
        type: 'quads',
      })),
    };
    mediatorUpdateQuads = {
      mediate: jest.fn(() => Promise.resolve({
        execute: () => Promise.resolve(),
      })),
    };
  });

  describe('An ActorQueryOperationLoad instance', () => {
    let actor: ActorQueryOperationLoad;

    beforeEach(() => {
      actor = new ActorQueryOperationLoad({ name: 'actor', bus, mediatorQueryOperation, mediatorUpdateQuads });
    });

    it('should test on load', () => {
      const op: any = { operation: { type: 'load' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op: any = {
        operation: { type: 'load' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-load', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: expect.anything(),
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'URL' ],
          [KeysQueryOperation.operation.name]: expect.anything(),
        }),
      });
    });

    it('should run with a given context', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
        },
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'SOMETHINGELSE' ],
        }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: expect.anything(),
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'URL' ],
          '@comunica/bus-query-operation:operation': expect.anything(),
        }),
      });
    });

    it('should run and allow updateResult to be awaited layer', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
    });

    it('should run with destination', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
          destination: DF.namedNode('GRAPH'),
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('GRAPH')),
      ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
    });

    it('should run for an empty source', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
        },
        context: new ActionContext(),
      };
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        type: 'quads',
      });
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
    });

    it('should run in silent mode', async() => {
      const op: any = {
        operation: {
          type: 'load',
          source: DF.namedNode('URL'),
          silent: true,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(await arrayifyStream(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamInsert)).toEqual([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      ]);
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].quadStreamDeleted).toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: expect.anything(),
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.sources.name]: [ 'URL' ],
          [KeysInitQuery.lenient.name]: true,
          [KeysQueryOperation.operation.name]: expect.anything(),
        }),
      });
    });
  });
});
