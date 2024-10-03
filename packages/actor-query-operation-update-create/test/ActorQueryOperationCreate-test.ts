import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationCreate } from '../lib/ActorQueryOperationCreate';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorQueryOperationCreate', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorUpdateQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorUpdateQuads = {
      mediate: jest.fn(() => Promise.resolve({
        execute: () => Promise.resolve(),
      })),
    };
  });

  describe('An ActorQueryOperationCreate instance', () => {
    let actor: ActorQueryOperationCreate;

    beforeEach(() => {
      actor = new ActorQueryOperationCreate({ name: 'actor', bus, mediatorQueryOperation, mediatorUpdateQuads });
    });

    it('should test on create', async() => {
      const op: any = { operation: { type: 'create' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on readOnly', async() => {
      const op: any = {
        operation: { type: 'create' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-create', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports create operations, but got some-other-type`);
    });

    it('should run in normal mode', async() => {
      const op: any = {
        operation: {
          type: 'create',
          source: DF.namedNode('g1'),
          silent: false,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].createGraphs).toEqual({
        graphs: [ DF.namedNode('g1') ],
        requireNonExistence: true,
      });
    });

    it('should run in silent mode', async() => {
      const op: any = {
        operation: {
          type: 'create',
          source: DF.namedNode('g1'),
          silent: true,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].createGraphs).toEqual({
        graphs: [ DF.namedNode('g1') ],
        requireNonExistence: false,
      });
    });
  });
});
