import type {
  IActorQueryOperationOutputUpdate,
} from '@comunica/bus-query-operation';
import { KEY_CONTEXT_READONLY } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationAddRewrite } from '../lib/ActorQueryOperationAddRewrite';
const DF = new DataFactory();
const factory = new Factory();

describe('ActorQueryOperationAdd', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: jest.fn((arg: any) => Promise.resolve({
        updateResult: Promise.resolve(),
        type: 'update',
      })),
    };
  });

  describe('An ActorQueryOperationAdd instance', () => {
    let actor: ActorQueryOperationAddRewrite;

    beforeEach(() => {
      actor = new ActorQueryOperationAddRewrite({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on add', () => {
      const op = { operation: { type: 'add' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op = { operation: { type: 'add' }, context: ActionContext({ [KEY_CONTEXT_READONLY]: true }) };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-add', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with named source and named destination', async() => {
      const op = {
        operation: {
          type: 'add',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('DEST'),
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))),
      });
    });

    it('should run with default source and named destination', async() => {
      const op = {
        operation: {
          type: 'add',
          source: 'DEFAULT',
          destination: DF.namedNode('DEST'),
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())),
      });
    });

    it('should run with named source and default destination', async() => {
      const op = {
        operation: {
          type: 'add',
          source: DF.namedNode('SOURCE'),
          destination: 'DEFAULT',
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))),
      });
    });

    it('should run with default source and default destination', async() => {
      const op = {
        operation: {
          type: 'add',
          source: 'DEFAULT',
          destination: 'DEFAULT',
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())),
      });
    });
  });
});
