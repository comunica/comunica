import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDrop } from '../lib/ActorQueryOperationDrop';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorQueryOperationDrop', () => {
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

  describe('An ActorQueryOperationDrop instance', () => {
    let actor: ActorQueryOperationDrop;

    beforeEach(() => {
      actor = new ActorQueryOperationDrop({ name: 'actor', bus, mediatorQueryOperation, mediatorUpdateQuads });
    });

    it('should test on clear', async() => {
      const op: any = { operation: { type: 'drop' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on readOnly', async() => {
      const op: any = {
        operation: { type: 'drop' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-clear', async() => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports drop operations, but got some-other-type`);
    });

    it('should run for default graph', async() => {
      const op: any = {
        operation: {
          type: 'drop',
          source: 'DEFAULT',
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for default graph in silent mode', async() => {
      const op: any = {
        operation: {
          type: 'drop',
          source: 'DEFAULT',
          silent: true,
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: false,
        dropGraphs: true,
      });
    });

    it('should run for all graphs', async() => {
      const op: any = {
        operation: {
          type: 'drop',
          source: 'ALL',
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'ALL',
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for all named graphs', async() => {
      const op: any = {
        operation: {
          type: 'drop',
          source: 'NAMED',
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'NAMED',
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for a named graph', async() => {
      const op: any = {
        operation: {
          type: 'drop',
          source: DF.namedNode('g1'),
        },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op, undefined);
      expect(output.type).toBe('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: [ DF.namedNode('g1') ],
        requireExistence: true,
        dropGraphs: true,
      });
    });
  });
});
