import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IJoinEntry, IPhysicalQueryPlanLogger, IPhysicalQueryPlanNode } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { ArrayIterator, UnionIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationJoin } from '../lib/ActorQueryOperationJoin';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperationJoin', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let mediatorJoin: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 3 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
    mediatorJoin = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new UnionIterator(
          arg.entries.map((entry: IJoinEntry) => entry.output.bindingsStream),
          { autoStart: false },
        ),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 100 },
          variables: [
            { variable: DF.variable('a'), canBeUndef: false },
            { variable: DF.variable('b'), canBeUndef: false },
          ],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };
  });

  describe('The ActorQueryOperationJoin module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationJoin constructor', () => {
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperationJoin);
      expect(new (<any> ActorQueryOperationJoin)({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationJoin objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationJoin)();
      }).toThrow(`Class constructor ActorQueryOperationJoin cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationJoin instance', () => {
    let actor: ActorQueryOperationJoin;

    beforeEach(() => {
      actor = new ActorQueryOperationJoin({ name: 'actor', bus, mediatorQueryOperation, mediatorJoin });
    });

    it('should test on join', async() => {
      const op: any = { operation: { type: 'join' }};
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-join', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports join operations, but got some-other-type`);
    });

    it('should run', async() => {
      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'exact', value: 100 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });
    it('should run when one of the join entries has an estimated cardinality of 0', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'estimate', value: 0 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });

      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        cardinality: { type: 'exact', value: 100 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
    });

    it('should run when one of the join entries is empty', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 0 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });

      const op: any = { operation: { type: 'join', input: [{}, {}, {}]}, context: new ActionContext() };
      const output = getSafeBindings(await actor.run(op, undefined));
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 0 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ],
      });
      await expect(output.bindingsStream).toEqualBindingsStream([]);
    });

    it('should log an empty join in the physical query plan when one of the join entries is empty', async() => {
      mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: { type: 'exact', value: 0 },
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      });
      const parentNode: IPhysicalQueryPlanNode = <any> { id: 'parent' };
      const entryNode: IPhysicalQueryPlanNode = <any> { id: 'entry' };
      const planNode: IPhysicalQueryPlanNode = {
        appendMetadata: vi.fn(),
        adoptInput: vi.fn(),
        setOutput: vi.fn(),
      };
      const logger: IPhysicalQueryPlanLogger = {
        logOperation: vi.fn().mockReturnValue(planNode),
        finalize: vi.fn(),
        // Only the first entry was logged as a node of its own
        getNodeForOutput: vi.fn().mockReturnValueOnce(entryNode),
        toJson: vi.fn(),
      };
      const context = new ActionContext({
        [KeysInitQuery.physicalQueryPlanLogger.name]: logger,
        [KeysInitQuery.physicalQueryPlanNode.name]: parentNode,
      });

      const op: any = { operation: { type: 'join', input: [{}, {}]}, context };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      // The first logged operation is the join itself, under which no physical join actor runs
      expect(logger.logOperation).toHaveBeenNthCalledWith(2, {
        logicalOperator: 'join-inner',
        physicalOperator: 'empty',
        parentNode: planNode,
        actor: 'actor',
      });
      expect(logger.getNodeForOutput).toHaveBeenCalledTimes(2);
      expect(planNode.adoptInput).toHaveBeenCalledTimes(1);
      expect(planNode.adoptInput).toHaveBeenCalledWith(entryNode);
    });
  });
});
