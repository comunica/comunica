import type { IQueryProcessSequential } from '@comunica/bus-query-process';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorQueryProcessExplainParsed } from '../lib/ActorQueryProcessExplainParsed';
import '@comunica/utils-jest';

describe('ActorQueryProcessExplainParsed', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryProcessExplainParsed instance', () => {
    let actor: ActorQueryProcessExplainParsed;
    let queryProcessor: IQueryProcessSequential;

    beforeEach(() => {
      queryProcessor = <any>{
        async parse(query: string) {
          return { operation: `${query}OP` };
        },
      };
      actor = new ActorQueryProcessExplainParsed({ name: 'actor', bus, queryProcessor });
    });

    describe('test', () => {
      it('rejects on no explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext() }))
          .resolves.toFailTest(`actor can only explain in 'parsed' mode.`);
      });

      it('rejects on wrong explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'logical') }))
          .resolves.toFailTest(`actor can only explain in 'parsed' mode.`);
      });

      it('handles parsed explain in context', async() => {
        await expect(actor.test({
          query: 'q',
          context: new ActionContext().set(KeysInitQuery.explain, 'parsed'),
        })).resolves
          .toPassTestVoid();
      });

      it('handles parsed explain in raw context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().setRaw('explain', 'parsed') })).resolves
          .toPassTestVoid();
      });
    });

    describe('run', () => {
      it('handles parsed explain in context', async() => {
        await expect(actor.run({
          query: 'q',
          context: new ActionContext().set(KeysInitQuery.explain, 'parsed'),
        })).resolves
          .toEqual({
            result: {
              explain: true,
              type: 'parsed',
              data: 'qOP',
            },
          });
      });
    });
  });
});
