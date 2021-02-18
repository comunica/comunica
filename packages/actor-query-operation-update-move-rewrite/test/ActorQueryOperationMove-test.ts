import type { IActorQueryOperationOutputUpdate } from '@comunica/bus-query-operation';
import { KEY_CONTEXT_READONLY } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationMoveRewrite } from '../lib/ActorQueryOperationMoveRewrite';
const DF = new DataFactory();
const factory = new Factory();

describe('ActorQueryOperationMove', () => {
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

  describe('An ActorQueryOperationMove instance', () => {
    let actor: ActorQueryOperationMoveRewrite;

    beforeEach(() => {
      actor = new ActorQueryOperationMoveRewrite({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on move', () => {
      const op = { operation: { type: 'move' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op = { operation: { type: 'move' }, context: ActionContext({ [KEY_CONTEXT_READONLY]: true }) };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-move', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with different named source and named dest', async() => {
      const op = {
        operation: {
          type: 'move',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('DEST'),
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), false),
          factory.createDrop(DF.namedNode('SOURCE')),
        ]),
      });
    });

    it('should run with different named source and named dest in silent mode', async() => {
      const op = {
        operation: {
          type: 'move',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('DEST'),
          silent: true,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), true),
          factory.createDrop(DF.namedNode('SOURCE')),
        ]),
      });
    });

    it('should run with equal named source and named dest', async() => {
      const op = {
        operation: {
          type: 'move',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('SOURCE'),
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).not.toHaveBeenCalled();
    });

    it('should run with equal default source and default dest', async() => {
      const op = {
        operation: {
          type: 'move',
          source: 'DEFAULT',
          destination: 'DEFAULT',
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).not.toHaveBeenCalled();
    });

    it('should run with different default source and named dest', async() => {
      const op = {
        operation: {
          type: 'move',
          source: 'DEFAULT',
          destination: DF.namedNode('DEST'),
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd('DEFAULT', DF.namedNode('DEST'), false),
          factory.createDrop('DEFAULT'),
        ]),
      });
    });

    it('should run with different named source and default dest', async() => {
      const op = {
        operation: {
          type: 'move',
          source: DF.namedNode('SOURCE'),
          destination: 'DEFAULT',
          silent: false,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        operation: factory.createCompositeUpdate([
          factory.createDrop('DEFAULT', true),
          factory.createAdd(DF.namedNode('SOURCE'), 'DEFAULT', false),
          factory.createDrop(DF.namedNode('SOURCE')),
        ]),
      });
    });
  });
});
