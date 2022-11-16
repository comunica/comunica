import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultVoid } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationClear } from '../lib/ActorQueryOperationClear';

const DF = new DataFactory();

describe('ActorQueryOperationClear', () => {
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

  describe('An ActorQueryOperationClear instance', () => {
    let actor: ActorQueryOperationClear;

    beforeEach(() => {
      actor = new ActorQueryOperationClear({ name: 'actor', bus, mediatorQueryOperation, mediatorUpdateQuads });
    });

    it('should test on clear', () => {
      const op: any = { operation: { type: 'clear' }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op: any = {
        operation: { type: 'clear' },
        context: new ActionContext({ [KeysQueryOperation.readOnly.name]: true }),
      };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-clear', () => {
      const op: any = { operation: { type: 'some-other-type' }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run for default graph', async() => {
      const op: any = {
        operation: {
          type: 'clear',
          source: 'DEFAULT',
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: true,
        dropGraphs: false,
      });
    });

    it('should run for default graph in silent mode', async() => {
      const op: any = {
        operation: {
          type: 'clear',
          source: 'DEFAULT',
          silent: true,
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: false,
        dropGraphs: false,
      });
    });

    it('should run for all graphs', async() => {
      const op: any = {
        operation: {
          type: 'clear',
          source: 'ALL',
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'ALL',
        requireExistence: true,
        dropGraphs: false,
      });
    });

    it('should run for all named graphs', async() => {
      const op: any = {
        operation: {
          type: 'clear',
          source: 'NAMED',
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'NAMED',
        requireExistence: true,
        dropGraphs: false,
      });
    });

    it('should run for a named graph', async() => {
      const op: any = {
        operation: {
          type: 'clear',
          source: DF.namedNode('g1'),
        },
        context: new ActionContext(),
      };
      const output = <IQueryOperationResultVoid> await actor.run(op);
      expect(output.type).toEqual('void');
      await expect(output.execute()).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: [ DF.namedNode('g1') ],
        requireExistence: true,
        dropGraphs: false,
      });
    });
  });
});
