import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationSortLimitPushdown } from '../lib/ActorOptimizeQueryOperationSortLimitPushdown';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorOptimizeQueryOperationSortLimitPushdown', () => {
  let bus: any;
  let factory: AlgebraFactory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    factory = new AlgebraFactory();
  });

  describe('An ActorOptimizeQueryOperationSortLimitPushdown instance', () => {
    let actor: ActorOptimizeQueryOperationSortLimitPushdown;
    let context: IActionContext;
    let pattern: Algebra.Pattern;
    let orderBy: Algebra.OrderBy;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationSortLimitPushdown({ name: 'actor', bus });
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
      pattern = factory.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o'));
      orderBy = factory.createOrderBy(pattern, [ factory.createTermExpression(DF.variable('s')) ]);
    });

    const run = async(operation: Algebra.Operation): Promise<Algebra.Operation> =>
      (await actor.run({ operation, context })).operation;

    it('should test', async() => {
      await expect(actor.test({ operation: <any> undefined, context })).resolves.toPassTestVoid();
    });

    it('should annotate an order by directly below a slice', async() => {
      const operation = factory.createSlice(orderBy, 0, 10);
      await expect(run(operation)).resolves.toMatchObject({
        input: { metadata: { sortLimit: 10 }},
      });
    });

    it('should include the offset in the annotation', async() => {
      const operation = factory.createSlice(orderBy, 90, 10);
      await expect(run(operation)).resolves.toMatchObject({
        input: { metadata: { sortLimit: 100 }},
      });
    });

    it('should annotate an order by below a projection', async() => {
      const operation = factory.createSlice(factory.createProject(orderBy, [ DF.variable('s') ]), 0, 10);
      await expect(run(operation)).resolves.toMatchObject({
        input: { input: { metadata: { sortLimit: 10 }}},
      });
    });

    it('should annotate an order by below nested projections', async() => {
      const operation = factory.createSlice(
        factory.createProject(factory.createProject(orderBy, [ DF.variable('s') ]), [ DF.variable('s') ]),
        0,
        10,
      );
      await expect(run(operation)).resolves.toMatchObject({
        input: { input: { input: { metadata: { sortLimit: 10 }}}},
      });
    });

    it('should annotate an order by within a nested slice', async() => {
      const operation = factory.createProject(
        factory.createSlice(factory.createProject(orderBy, [ DF.variable('s') ]), 0, 10),
        [ DF.variable('s') ],
      );
      await expect(run(operation)).resolves.toMatchObject({
        input: { input: { input: { metadata: { sortLimit: 10 }}}},
      });
    });

    it('should preserve existing metadata on the order by', async() => {
      orderBy.metadata = { scopedSource: 'source' };
      const operation = factory.createSlice(orderBy, 0, 10);
      await expect(run(operation)).resolves.toMatchObject({
        input: { metadata: { scopedSource: 'source', sortLimit: 10 }},
      });
    });

    it('should not modify the input operation', async() => {
      const operation = factory.createSlice(factory.createProject(orderBy, [ DF.variable('s') ]), 0, 10);
      await run(operation);
      expect(orderBy.metadata).toBeUndefined();
    });

    it('should not annotate without a limit', async() => {
      const operation = factory.createSlice(orderBy, 10);
      await expect(run(operation)).resolves.toEqual(operation);
    });

    it('should not annotate when there is no order by', async() => {
      const operation = factory.createSlice(factory.createProject(pattern, [ DF.variable('s') ]), 0, 10);
      await expect(run(operation)).resolves.toEqual(operation);
    });

    it('should not traverse a distinct', async() => {
      const operation = factory.createSlice(factory.createDistinct(orderBy), 0, 10);
      await expect(run(operation)).resolves.toEqual(operation);
    });

    it('should not annotate an order by without a slice above it', async() => {
      const operation = factory.createProject(orderBy, [ DF.variable('s') ]);
      await expect(run(operation)).resolves.toEqual(operation);
    });
  });
});
