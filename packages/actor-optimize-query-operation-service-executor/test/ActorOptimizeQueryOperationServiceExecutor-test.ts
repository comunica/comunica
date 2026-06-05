import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationServiceExecutor } from '../lib/ActorOptimizeQueryOperationServiceExecutor';
import { QuerySourceServiceExecutor } from '../lib/QuerySourceServiceExecutor';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationServiceExecutor', () => {
  let bus: any;
  let contextIn: IActionContext;
  let operation: Algebra.Operation;
  let operationService: Algebra.Operation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    contextIn = new ActionContext();
    operation = <any> {};
    operationService = AF.createJoin([
      AF.createService(<any> {}, DF.namedNode('source1')),
      AF.createService(<any> {}, DF.namedNode('source2')),
      AF.createService(<any> {}, DF.variable('source3')),
    ]);
  });

  describe('An ActorOptimizeQueryOperationServiceExecutor instance', () => {
    let actor: ActorOptimizeQueryOperationServiceExecutor;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationServiceExecutor({
        name: 'actor',
        bus,
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).toBe(contextIn);
      });

      it('with SERVICE clauses and no custom service executors', async() => {
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });
        expect(contextOut).toBe(contextIn);
      });

      it('with SERVICE clauses and custom service executors', async() => {
        const serviceExecutor = jest.fn();
        contextIn = contextIn.set(KeysInitQuery.serviceExecutors, {
          source1: serviceExecutor,
        });
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });

        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.serviceSources)).toMatchObject({
          source1: {
            source: {
              referenceValue: 'source1',
              supportsServiceOperationInjection: true,
            },
          },
        });
        expect(Object.keys(contextOut.get(KeysQueryOperation.serviceSources)!)).toEqual([ 'source1' ]);
        expect(contextOut.get(KeysQueryOperation.serviceSources)!.source1.source)
          .toBeInstanceOf(QuerySourceServiceExecutor);
      });

      it('with SERVICE clauses and a custom service executor creator', async() => {
        const serviceExecutor = jest.fn();
        contextIn = contextIn.set(KeysInitQuery.serviceExecutorCreator, async serviceNamedNode =>
          serviceNamedNode.value === 'source1' ? serviceExecutor : undefined);
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });

        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.serviceSources)).toMatchObject({
          source1: {
            source: {
              referenceValue: 'source1',
              supportsServiceOperationInjection: true,
            },
          },
        });
        expect(Object.keys(contextOut.get(KeysQueryOperation.serviceSources)!)).toEqual([ 'source1' ]);
      });

      it('with SERVICE clauses and both custom service executor variants should reject', async() => {
        contextIn = contextIn
          .set(KeysInitQuery.serviceExecutors, { source1: jest.fn() })
          .set(KeysInitQuery.serviceExecutorCreator, async() => undefined);
        await expect(actor.run({ context: contextIn, operation: operationService }))
          .rejects.toThrow('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
      });

      it('with existing SERVICE sources should preserve them and add custom service executors', async() => {
        const existingSource: IQuerySourceWrapper = <any> {
          source: { referenceValue: 'source2' },
          context: new ActionContext({ existing: true }),
        };
        const serviceExecutor = jest.fn();
        contextIn = contextIn
          .set(KeysQueryOperation.serviceSources, { source2: existingSource })
          .set(KeysInitQuery.serviceExecutors, {
            source1: serviceExecutor,
          });
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });

        expect(contextOut.get(KeysQueryOperation.serviceSources)).toMatchObject({
          source1: {
            source: {
              referenceValue: 'source1',
              supportsServiceOperationInjection: true,
            },
          },
          source2: existingSource,
        });
        expect(contextOut.get(KeysQueryOperation.serviceSources)!.source2).toBe(existingSource);
      });
    });
  });
});
