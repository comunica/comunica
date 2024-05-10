import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator, BufferedIterator, range } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationAsk } from '../lib/ActorQueryOperationAsk';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorQueryOperationAsk', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorQueryOperationEmpty: any;
  let mediatorQueryOperationError: any;
  let mediatorQueryOperationInf: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
    mediatorQueryOperationEmpty = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
    mediatorQueryOperationError = {
      mediate: (arg: any) => new Promise((resolve, reject) => {
        const bindingsStream = new BufferedIterator();
        setImmediate(() => bindingsStream.emit('error', new Error('Error!')));
        resolve({
          bindingsStream,
          metadata: () => Promise.resolve({ cardinality: 0 }),
          operated: arg,
          type: 'bindings',
          variables: [ DF.variable('a') ],
        });
      }),
    };
    mediatorQueryOperationInf = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: range(0, Number.POSITIVE_INFINITY),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ DF.variable('a') ],
      }),
    };
  });

  describe('The ActorQueryOperationAsk module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationAsk).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationAsk constructor', () => {
      expect(new (<any> ActorQueryOperationAsk)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationAsk);
      expect(new (<any> ActorQueryOperationAsk)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationAsk objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationAsk)();
      }).toThrow(`Class constructor ActorQueryOperationAsk cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationAsk instance', () => {
    let actor: ActorQueryOperationAsk;

    beforeEach(() => {
      actor = new ActorQueryOperationAsk({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on ask', async() => {
      const op: any = { operation: { type: 'ask' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-ask', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a non-empty stream', async() => {
      const op: any = { operation: { type: 'ask' }, context: new ActionContext() };
      const output = ActorQueryOperation.getSafeBoolean(await actor.run(op));
      expect(output.type).toBe('boolean');
      await expect(output.execute()).resolves.toBeTruthy();
    });

    it('should run on an empty stream', async() => {
      const op: any = { operation: { type: 'ask' }, context: new ActionContext() };
      const actorEmpty = new ActorQueryOperationAsk(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationEmpty },
      );
      const output = ActorQueryOperation.getSafeBoolean(await actorEmpty.run(op));
      expect(output.type).toBe('boolean');
      await expect(output.execute()).resolves.toBeFalsy();
    });

    it('should run and return a rejecting promise on an errorring stream', async() => {
      const op: any = { operation: { type: 'ask' }, context: new ActionContext() };
      const actorError = new ActorQueryOperationAsk(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationError },
      );
      const output = ActorQueryOperation.getSafeBoolean(await actorError.run(op));
      expect(output.type).toBe('boolean');
      await expect(output.execute()).rejects.toBeTruthy();
    });
  });
});
