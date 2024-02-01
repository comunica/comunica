import type { IQueryProcessSequential } from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { MemoryPhysicalQueryPlanLogger } from '../lib';
import { ActorQueryProcessExplainPhysical } from '../lib/ActorQueryProcessExplainPhysical';

describe('ActorQueryProcessExplainPhysical', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryProcessExplainPhysical instance', () => {
    let actor: ActorQueryProcessExplainPhysical;
    let queryProcessor: IQueryProcessSequential;

    beforeEach(() => {
      queryProcessor = <any>{
        async parse(query: string, context: any) {
          return { operation: `${query}PARSE`, context };
        },
        async optimize(query: string, context: any) {
          return { operation: `${query}OPT`, context };
        },
        evaluate: jest.fn(async(query: string, context: any) => {
          return {
            type: 'bindings',
            bindingsStream: new ArrayIterator([], { autoStart: false }),
          };
        }),
      };
      actor = new ActorQueryProcessExplainPhysical({ name: 'actor', bus, queryProcessor });
    });

    describe('test', () => {
      it('rejects on no explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext() }))
          .rejects.toThrow(`actor can only explain in 'physical' mode.`);
      });

      it('rejects on wrong explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'parsed') }))
          .rejects.toThrow(`actor can only explain in 'physical' mode.`);
      });

      it('handles physical explain in context', async() => {
        expect(await actor.test({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'physical') }))
          .toBeTruthy();
      });
    });

    describe('run', () => {
      it('handles physical explain in context', async() => {
        expect(await actor.run({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'physical') }))
          .toEqual({
            result: {
              explain: true,
              type: 'physical',
              data: {},
            },
          });
        expect(queryProcessor.evaluate).toHaveBeenCalledWith('qPARSEOPT', new ActionContext()
          .set(KeysInitQuery.explain, 'physical')
          .set(KeysInitQuery.physicalQueryPlanLogger, new MemoryPhysicalQueryPlanLogger()));
      });

      it('handles physical explain in context for quad outputs', async() => {
        (<any> queryProcessor).evaluate = async(query: string, context: any) => {
          return {
            type: 'quads',
            quadStream: new ArrayIterator([], { autoStart: false }),
          };
        };

        expect(await actor.run({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'physical') }))
          .toEqual({
            result: {
              explain: true,
              type: 'physical',
              data: {},
            },
          });
      });

      it('handles physical explain in context for boolean outputs', async() => {
        (<any> queryProcessor).evaluate = async(query: string, context: any) => {
          return {
            type: 'boolean',
            execute: jest.fn(),
          };
        };

        expect(await actor.run({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'physical') }))
          .toEqual({
            result: {
              explain: true,
              type: 'physical',
              data: {},
            },
          });
      });

      it('handles physical explain in context for void outputs', async() => {
        (<any> queryProcessor).evaluate = async(query: string, context: any) => {
          return {
            type: 'void',
            execute: jest.fn(),
          };
        };

        expect(await actor.run({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'physical') }))
          .toEqual({
            result: {
              explain: true,
              type: 'physical',
              data: {},
            },
          });
      });
    });
  });
});
