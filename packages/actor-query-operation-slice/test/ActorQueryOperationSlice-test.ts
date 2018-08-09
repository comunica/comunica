import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationSlice} from "../lib/ActorQueryOperationSlice";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationSlice', () => {
  let bus;
  let mediatorQueryOperation;
  let mediatorQueryOperationNoMeta;
  let mediatorQueryOperationMetaInf;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    mediatorQueryOperationNoMeta = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: null,
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
    mediatorQueryOperationMetaInf = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: Infinity }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
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
      const op = { operation: { type: 'slice', start: 0, length: 100 } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-slices', () => {
      const op = { operation: { type: 'no-slice' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a stream for start 0 and length 100', () => {
      const op = { operation: { type: 'project', start: 0, length: 100 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 100', () => {
      const op = { operation: { type: 'project', start: 1, length: 100 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 3 and length 100', () => {
      const op = { operation: { type: 'project', start: 3, length: 100 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 0 and length 3', () => {
      const op = { operation: { type: 'project', start: 0, length: 3 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 2', () => {
      const op = { operation: { type: 'project', start: 0, length: 2 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 0', () => {
      const op = { operation: { type: 'project', start: 0, length: 0 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 1 and length 3', () => {
      const op = { operation: { type: 'project', start: 1, length: 3 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 1 and length 1', () => {
      const op = { operation: { type: 'project', start: 1, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 1 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('2') }),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 1', () => {
      const op = { operation: { type: 'project', start: 2, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 1 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 2 and length 0', () => {
      const op = { operation: { type: 'project', start: 2, length: 0 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 3 and length 1', () => {
      const op = { operation: { type: 'project', start: 3, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 3 and length 0', () => {
      const op = { operation: { type: 'project', start: 3, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 4 and length 1', () => {
      const op = { operation: { type: 'project', start: 4, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 4 and length 0', () => {
      const op = { operation: { type: 'project', start: 4, length: 1 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides no metadata', () => {
      actor = new ActorQueryOperationSlice({ bus, mediatorQueryOperation: mediatorQueryOperationNoMeta,
        name: 'actor' });
      const op = { operation: { type: 'project', start: 0, length: 100 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.metadata).toBeFalsy();
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and length 100 when the mediator provides metadata with infinity', () => {
      actor = new ActorQueryOperationSlice({ bus, mediatorQueryOperation: mediatorQueryOperationMetaInf,
        name: 'actor' });
      const op = { operation: { type: 'project', start: 0, length: 100 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: Infinity });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });

    it('should run on a stream for start 0 and no length', () => {
      const op = { operation: { type: 'project', start: 0 } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 3 });
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
      });
    });
  });
});
