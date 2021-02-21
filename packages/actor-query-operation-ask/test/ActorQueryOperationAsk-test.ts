import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBoolean } from '@comunica/types';
import { ArrayIterator, BufferedIterator, range } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationAsk } from '../lib/ActorQueryOperationAsk';
const DF = new DataFactory();

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
          Bindings({ a: DF.literal('1') }),
          Bindings({ a: DF.literal('2') }),
          Bindings({ a: DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorQueryOperationEmpty = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
      }),
    };
    mediatorQueryOperationError = {
      mediate: (arg: any) => new Promise((resolve, reject) => {
        const bindingsStream = new BufferedIterator();
        setImmediate(() => bindingsStream.emit('error', new Error('Error!')));
        resolve({
          bindingsStream,
          metadata: () => Promise.resolve({ totalItems: 0 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        });
      }),
    };
    mediatorQueryOperationInf = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: range(0, Number.POSITIVE_INFINITY),
        metadata: () => Promise.resolve({ totalItems: 0 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
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
      expect(() => { (<any> ActorQueryOperationAsk)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationAsk instance', () => {
    let actor: ActorQueryOperationAsk;

    beforeEach(() => {
      actor = new ActorQueryOperationAsk({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on ask', () => {
      const op = { operation: { type: 'ask' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-ask', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a non-empty stream', () => {
      const op = { operation: { type: 'ask' }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBoolean) => {
        expect(output.type).toEqual('boolean');
        expect(await output.booleanResult).toBeTruthy();
      });
    });

    it('should run on an empty stream', () => {
      const op = { operation: { type: 'ask' }};
      const actorEmpty = new ActorQueryOperationAsk(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationEmpty },
      );
      return actorEmpty.run(op).then(async(output: IActorQueryOperationOutputBoolean) => {
        expect(output.type).toEqual('boolean');
        expect(await output.booleanResult).toBeFalsy();
      });
    });

    it('should run and return a rejecting promise on an errorring stream', () => {
      const op = { operation: { type: 'ask' }};
      const actorError = new ActorQueryOperationAsk(
        { name: 'actor', bus, mediatorQueryOperation: mediatorQueryOperationError },
      );
      return actorError.run(op).then(async(output: IActorQueryOperationOutputBoolean) => {
        expect(output.type).toEqual('boolean');
        return expect(output.booleanResult).rejects.toBeTruthy();
      });
    });
  });
});
