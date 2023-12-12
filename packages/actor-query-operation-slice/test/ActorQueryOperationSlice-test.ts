import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings,
  IQueryOperationResultQuads } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationSlice } from '../lib/ActorQueryOperationSlice';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationSlice', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorQueryOperationMetaInf: any;
  let mediatorQueryOperationUndefs: any;
  let mediatorQueryOperationQuads: any;
  let mediatorQueryOperationBoolean: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      })),
    };
    mediatorQueryOperationMetaInf = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorQueryOperationUndefs = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: true,
          variables: [ DF.variable('a') ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorQueryOperationQuads = {
      mediate: (arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('3')),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: { type: 'estimate', value: 3 }, canContainUndefs: false }),
        operated: arg,
        type: 'quads',
      }),
    };
    mediatorQueryOperationBoolean = {
      mediate: (arg: any) => Promise.resolve({
        booleanResult: true,
        type: 'boolean',
      }),
    };
  });

  describe('The ActorQueryOperationSlice module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationSlice).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationSlice constructor', () => {
      expect(new (<any> ActorQueryOperationSlice)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationSlice);
      expect(new (<any> ActorQueryOperationSlice)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationSlice objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationSlice)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationSlice instance', () => {
    let actor: ActorQueryOperationSlice;

    beforeEach(() => {
      actor = new ActorQueryOperationSlice({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on slices', () => {
      const op: any = { operation: { type: 'slice', start: 0, length: 100 }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-slices', () => {
      const op: any = { operation: { type: 'no-slice' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream for start 0 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        expect(mediatorQueryOperation.mediate.mock.calls[0][0].context.get(KeysQueryOperation.limitIndicator))
          .toEqual(100);
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 100 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 3 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 100 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 0 and length 3', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 3 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 2', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 2 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 0 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(mediatorQueryOperation.mediate.mock.calls[0][0].context.get(KeysQueryOperation.limitIndicator))
          .toBeUndefined();
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 1 and length 3', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 3 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 2 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 2, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 1 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 2, length: 0 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 3 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 3 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 4 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 4 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 0 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides metadata with infinity', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationMetaInf,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides undefs', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationUndefs,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: true,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream for start 0 and no length', () => {
      const op: any = { operation: { type: 'project', start: 0 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultBindings) => {
        expect(await output.metadata()).toEqual({
          cardinality: { type: 'estimate', value: 3 },
          canContainUndefs: false,
          variables: [ DF.variable('a') ],
        });
        expect(output.type).toEqual('bindings');
        await expect(output.bindingsStream).toEqualBindingsStream([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ]);
      });
    });

    it('should run on a stream of quads for start 0 and length 2', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationQuads,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 2 }, context: new ActionContext() };
      return actor.run(op).then(async(output: IQueryOperationResultQuads) => {
        expect(await output.metadata())
          .toEqual({ cardinality: { type: 'estimate', value: 2 }, canContainUndefs: false });
        expect(output.type).toEqual('quads');
        expect(await arrayifyStream(output.quadStream)).toEqual([
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
        ]);
      });
    });

    it('should error if the output is neither quads nor bindings', async() => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationBoolean,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0 }, context: new ActionContext() };
      await expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
