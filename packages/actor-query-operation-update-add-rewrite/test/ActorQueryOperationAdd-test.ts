import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
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
        execute: () => Promise.resolve(),
        type: 'void',
      })),
    };
  });

  describe('An ActorQueryOperationAdd instance', () => {
    let actor: ActorQueryOperationAddRewrite;

    beforeEach(() => {
      actor = new ActorQueryOperationAddRewrite({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on add', () => {
      const op: any = { operation: { type: 'add' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op: any = {
        operation: { type: 'add' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-add', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with named source and named destination', async() => {
      const op: any = {
        operation: {
          type: 'add',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('DEST'),
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))),
      });
    });

    it('should run with default source and named destination', async() => {
      const op: any = {
        operation: {
          type: 'add',
          source: 'DEFAULT',
          destination: DF.namedNode('DEST'),
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())),
      });
    });

    it('should run with named source and default destination', async() => {
      const op: any = {
        operation: {
          type: 'add',
          source: DF.namedNode('SOURCE'),
          destination: 'DEFAULT',
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))),
      });
    });

    it('should run with default source and default destination', async() => {
      const op: any = {
        operation: {
          type: 'add',
          source: 'DEFAULT',
          destination: 'DEFAULT',
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        operation: factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())),
      });
    });
  });
});
