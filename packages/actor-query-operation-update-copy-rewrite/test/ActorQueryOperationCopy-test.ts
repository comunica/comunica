import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationCopyRewrite } from '../lib/ActorQueryOperationCopyRewrite';

const DF = new DataFactory();
const factory = new Factory();

describe('ActorQueryOperationCopy', () => {
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

  describe('An ActorQueryOperationCopy instance', () => {
    let actor: ActorQueryOperationCopyRewrite;

    beforeEach(() => {
      actor = new ActorQueryOperationCopyRewrite({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on copy', () => {
      const op: any = { operation: { type: 'copy' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op: any = {
        operation: { type: 'copy' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-copy', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with different named source and named dest', async() => {
      const op: any = {
        operation: {
          type: 'copy',
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
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), false),
        ]),
      });
    });

    it('should run with different named source and named dest in silent mode', async() => {
      const op: any = {
        operation: {
          type: 'copy',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('DEST'),
          silent: true,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
        context: expect.anything(),
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), true),
        ]),
      });
    });

    it('should run with equal named source and named dest', async() => {
      const op: any = {
        operation: {
          type: 'copy',
          source: DF.namedNode('SOURCE'),
          destination: DF.namedNode('SOURCE'),
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).not.toHaveBeenCalled();
    });

    it('should run with equal default source and default dest', async() => {
      const op: any = {
        operation: {
          type: 'copy',
          source: 'DEFAULT',
          destination: 'DEFAULT',
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorQueryOperation.mediate).not.toHaveBeenCalled();
    });

    it('should run with different default source and named dest', async() => {
      const op: any = {
        operation: {
          type: 'copy',
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
        operation: factory.createCompositeUpdate([
          factory.createDrop(DF.namedNode('DEST'), true),
          factory.createAdd('DEFAULT', DF.namedNode('DEST'), false),
        ]),
      });
    });

    it('should run with different named source and default dest', async() => {
      const op: any = {
        operation: {
          type: 'copy',
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
        operation: factory.createCompositeUpdate([
          factory.createDrop('DEFAULT', true),
          factory.createAdd(DF.namedNode('SOURCE'), 'DEFAULT', false),
        ]),
      });
    });
  });
});
