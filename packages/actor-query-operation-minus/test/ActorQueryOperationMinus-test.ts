import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationMinus } from '..';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationMinus', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let left: any;
  let right: any;
  let rightNoCommons: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: arg.operation.stream,
        metadata: arg.operation.metadata,
        type: 'bindings',
        variables: arg.operation.variables,
        canContainUndefs: arg.operation.canContainUndefs,
      }),
    };
    left = {
      metadata: () => Promise.resolve({ totalItems: 3 }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
        Bindings({ a: DF.literal('3') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
    };
    rightNoCommons = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ b: DF.literal('1') }),
        Bindings({ b: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'b' ],
      canContainUndefs: false,
    };
    right = {
      metadata: () => Promise.resolve({ totalItems: 2 }),
      stream: new ArrayIterator([
        Bindings({ a: DF.literal('1') }),
        Bindings({ a: DF.literal('2') }),
      ]),
      type: 'bindings',
      variables: [ 'a' ],
      canContainUndefs: false,
    };
  });

  describe('The ActorQueryOperationMinus module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationMinus).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationMinus constructor', () => {
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationMinus);
      expect(new (<any> ActorQueryOperationMinus)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationMinus objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationMinus)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationMinus instance', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      actor = new ActorQueryOperationMinus(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });

    it('should test on minus', () => {
      const op = { operation: { type: 'minus', left, right }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-minus', () => {
      const op = { operation: { type: 'some-other-type', left, right }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'minus', left, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });

    it('should run with a left stream without common variables', () => {
      const op = { operation: { type: 'union', left, right: rightNoCommons }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ]);
      });
    });
  });
  describe('An ActorQueryOperationMinus instance with undefs in the right stream', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      mediatorQueryOperation = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: arg.operation.stream,
          metadata: arg.operation.metadata,
          type: 'bindings',
          variables: arg.operation.variables,
          canContainUndefs: arg.operation.canContainUndefs,
        }),
      };
      left = {
        metadata: () => Promise.resolve({ totalItems: 3 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
            b: DF.literal('1'),
          }),
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
          Bindings({
            a: DF.literal('3'),
            b: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: false,
      };
      right = {
        metadata: () => Promise.resolve({ totalItems: 2 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
          }),
          Bindings({
            b: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: true,
      };
      actor = new ActorQueryOperationMinus(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });

    it('should run', () => {
      const op = { operation: { type: 'minus', left, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
      });
    });
  });

  describe('An ActorQueryOperationMinus instance with undefs in the left stream', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      mediatorQueryOperation = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: arg.operation.stream,
          metadata: arg.operation.metadata,
          type: 'bindings',
          variables: arg.operation.variables,
          canContainUndefs: arg.operation.canContainUndefs,
        }),
      };
      left = {
        metadata: () => Promise.resolve({ totalItems: 3 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
          }),
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
          Bindings({
            b: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: true,
      };
      right = {
        metadata: () => Promise.resolve({ totalItems: 2 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
            b: DF.literal('1'),
          }),
          Bindings({
            a: DF.literal('3'),
            b: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: false,
      };
      actor = new ActorQueryOperationMinus(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });

    it('should run', () => {
      const op = { operation: { type: 'minus', left, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
      });
    });
  });

  describe('An ActorQueryOperationMinus instance with undefs in the left and right stream', () => {
    let actor: ActorQueryOperationMinus;

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      mediatorQueryOperation = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: arg.operation.stream,
          metadata: arg.operation.metadata,
          type: 'bindings',
          variables: arg.operation.variables,
          canContainUndefs: arg.operation.canContainUndefs,
        }),
      };
      left = {
        metadata: () => Promise.resolve({ totalItems: 3 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
          }),
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
          Bindings({
            b: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: true,
      };
      right = {
        metadata: () => Promise.resolve({ totalItems: 2 }),
        stream: new ArrayIterator([
          Bindings({
            a: DF.literal('1'),
          }),
          Bindings({
            a: DF.literal('3'),
          }),
        ]),
        type: 'bindings',
        variables: [ 'a', 'b' ],
        canContainUndefs: true,
      };
      actor = new ActorQueryOperationMinus(
        { name: 'actor', bus, mediatorQueryOperation },
      );
    });

    it('should run', () => {
      const op = { operation: { type: 'minus', left, right }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a', 'b' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            a: DF.literal('2'),
            b: DF.literal('2'),
          }),
        ]);
      });
    });
  });
});
