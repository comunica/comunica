import {
  ActorQueryOperation,
  Bindings,
} from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings,
  IActorQueryOperationOutputQuads } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationSlice } from '../lib/ActorQueryOperationSlice';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

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
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorQueryOperationMetaInf = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorQueryOperationUndefs = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: true }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorQueryOperationQuads = {
      mediate: (arg: any) => Promise.resolve({
        quadStream: new ArrayIterator([
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('1')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('2')),
          DF.quad(DF.namedNode('http://example.com/s'), DF.namedNode('http://example.com/p'), DF.literal('3')),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
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
      const op: any = { operation: { type: 'slice', start: 0, length: 100 }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-slices', () => {
      const op: any = { operation: { type: 'no-slice' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream for start 0 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 100 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 100 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 2, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 3 and length 100', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 100 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 0 and length 3', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 3 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 2', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 2 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 2, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 0, length: 0 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 1 and length 3', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 3 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 2, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 1, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 1, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('2') }),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 2, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 1, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 2, length: 0 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 3 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 3 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 3, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 4 and length 1', () => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 4 and length 0', () => {
      const op: any = { operation: { type: 'project', start: 4, length: 1 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 0, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides metadata with infinity', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationMetaInf,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: Number.POSITIVE_INFINITY, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides undefs', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationUndefs,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 100 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: true });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and no length', () => {
      const op: any = { operation: { type: 'project', start: 0 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ cardinality: 3, canContainUndefs: false });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run on a stream of quads for start 0 and length 2', () => {
      actor = new ActorQueryOperationSlice({ bus,
        mediatorQueryOperation: mediatorQueryOperationQuads,
        name: 'actor' });
      const op: any = { operation: { type: 'project', start: 0, length: 2 }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputQuads) => {
        expect(await output.metadata()).toEqual({ cardinality: 2, canContainUndefs: false });
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
      const op: any = { operation: { type: 'project', start: 0 }};
      await expect(actor.run(op)).rejects.toBeTruthy();
    });
  });
});
