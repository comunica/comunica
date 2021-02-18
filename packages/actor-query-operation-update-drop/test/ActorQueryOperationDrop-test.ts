import type {
  IActorQueryOperationOutputUpdate,
} from '@comunica/bus-query-operation';
import { KEY_CONTEXT_READONLY } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationDrop } from '../lib/ActorQueryOperationDrop';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

describe('ActorQueryOperationDrop', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorUpdateQuads: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorUpdateQuads = {
      mediate: jest.fn(() => Promise.resolve({
        updateResult: Promise.resolve(),
      })),
    };
  });

  describe('An ActorQueryOperationDrop instance', () => {
    let actor: ActorQueryOperationDrop;

    beforeEach(() => {
      actor = new ActorQueryOperationDrop({ name: 'actor', bus, mediatorQueryOperation, mediatorUpdateQuads });
    });

    it('should test on clear', () => {
      const op = { operation: { type: 'drop' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on readOnly', () => {
      const op = { operation: { type: 'drop' }, context: ActionContext({ [KEY_CONTEXT_READONLY]: true }) };
      return expect(actor.test(op)).rejects.toThrowError(`Attempted a write operation in read-only mode`);
    });

    it('should not test on non-clear', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run for default graph', async() => {
      const op = {
        operation: {
          type: 'drop',
          source: 'DEFAULT',
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for default graph in silent mode', async() => {
      const op = {
        operation: {
          type: 'drop',
          source: 'DEFAULT',
          silent: true,
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.defaultGraph(),
        requireExistence: false,
        dropGraphs: true,
      });
    });

    it('should run for all graphs', async() => {
      const op = {
        operation: {
          type: 'drop',
          source: 'ALL',
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'ALL',
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for all named graphs', async() => {
      const op = {
        operation: {
          type: 'drop',
          source: 'NAMED',
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: 'NAMED',
        requireExistence: true,
        dropGraphs: true,
      });
    });

    it('should run for a named graph', async() => {
      const op = {
        operation: {
          type: 'drop',
          source: DF.namedNode('g1'),
        },
      };
      const output = <IActorQueryOperationOutputUpdate> await actor.run(op);
      expect(output.type).toEqual('update');
      await expect(output.updateResult).resolves.toBeUndefined();
      expect(mediatorUpdateQuads.mediate.mock.calls[0][0].deleteGraphs).toEqual({
        graphs: DF.namedNode('g1'),
        requireExistence: true,
        dropGraphs: true,
      });
    });
  });
});
