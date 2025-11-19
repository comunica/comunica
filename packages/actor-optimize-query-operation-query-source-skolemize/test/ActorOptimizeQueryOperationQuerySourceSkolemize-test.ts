import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { Algebra } from 'sparqlalgebrajs';
import {
  ActorOptimizeQueryOperationQuerySourceSkolemize,
} from '../lib/ActorOptimizeQueryOperationQuerySourceSkolemize';
import { QuerySourceSkolemized } from '../lib/QuerySourceSkolemized';
import '@comunica/utils-jest';

describe('ActorOptimizeQueryOperationQuerySourceSkolemize', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationQuerySourceSkolemize instance', () => {
    let actor: ActorOptimizeQueryOperationQuerySourceSkolemize;
    let operation: Algebra.Operation;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationQuerySourceSkolemize({ name: 'actor', bus });
      operation = <any> {};
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).toEqual(new ActionContext({
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
        }));
      });

      it('with sources', async() => {
        const source1: any = {
          source: { referenceValue: 'S0' },
        };
        const source2: any = {
          source: { referenceValue: 'S1' },
          context: new ActionContext({ a: 'b' }),
        };
        const contextIn = new ActionContext({
          [KeysQueryOperation.querySources.name]: [
            source1,
            source2,
          ],
        });
        const { context: contextOut } = await actor.run({ context: contextIn, operation });

        expect(contextOut).toEqual(new ActionContext({
          [KeysQuerySourceIdentify.sourceIds.name]: new Map([
            [ 'S0', '0' ],
            [ 'S1', '1' ],
          ]),
          [KeysQueryOperation.querySources.name]: [
            {
              source: new QuerySourceSkolemized(source1.source, '0'),
            },
            {
              source: new QuerySourceSkolemized(source2.source, '1'),
              context: new ActionContext({ a: 'b' }),
            },
          ],
        }));
      });

      it('with duplicate sources', async() => {
        const source1: any = {
          source: { referenceValue: 'S0' },
        };
        const source2: any = {
          source: { referenceValue: 'S1' },
          context: new ActionContext({ a: 'b' }),
        };
        const contextIn = new ActionContext({
          [KeysQueryOperation.querySources.name]: [
            source1,
            source1,
            source2,
            source2,
          ],
        });
        const { context: contextOut } = await actor.run({ context: contextIn, operation });

        expect(contextOut).toEqual(new ActionContext({
          [KeysQuerySourceIdentify.sourceIds.name]: new Map([
            [ 'S0', '0' ],
            [ 'S1', '1' ],
          ]),
          [KeysQueryOperation.querySources.name]: [
            {
              source: new QuerySourceSkolemized(source1.source, '0'),
            },
            {
              source: new QuerySourceSkolemized(source1.source, '0'),
            },
            {
              source: new QuerySourceSkolemized(source2.source, '1'),
              context: new ActionContext({ a: 'b' }),
            },
            {
              source: new QuerySourceSkolemized(source2.source, '1'),
              context: new ActionContext({ a: 'b' }),
            },
          ],
        }));
      });
    });
  });
});
