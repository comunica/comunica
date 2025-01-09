import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-inner-nestedloop';
import type {
  ActionIteratorTransform,
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuads,
  ITransformIteratorOutput,
} from '@comunica/bus-iterator-transform';
import {
  ActorIteratorTransform,
} from '@comunica/bus-iterator-transform';
import type {
  IActionRdfJoinSelectivity,
  IActorRdfJoinSelectivityOutput }
  from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus, failTest, passTestVoid } from '@comunica/core';
import { MediatorCombinePipeline } from '@comunica/mediator-combine-pipeline';
import type { IActionContext, MetadataBindings, MetadataQuads } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { KEY_CONTEXT_WRAPPED_RDF_JOIN, ActorRdfJoinWrapStream } from '../lib/ActorRdfJoinWrapStream';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

class DummyTransform extends ActorIteratorTransform {
  public transformCalls = 0;

  public async transformIteratorBindings(
    action: IActionIteratorTransformBindings,
  ): Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>> {
    // Return unchanged
    const transformedStream = action.stream.map((data: RDF.Bindings) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, metadata: action.metadata };
  }

  public async transformIteratorQuads(
    action: IActionIteratorTransformQuads,
  ): Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>> {
    // Return unchanged
    const transformedStream = action.stream.map((data: RDF.Quad) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, metadata: action.metadata };
  }

  public async testIteratorTransform(_action: ActionIteratorTransform) {
    return passTestVoid();
  }
}

describe('ActorRdfJoinWrapStream', () => {
  let bus: any;
  let busJoin: any;
  let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
    IActorTest,
    IActorRdfJoinSelectivityOutput
  >;
  let actorTransform1: DummyTransform;
  let actorTransform2: DummyTransform;
  let mediatorJoin: any;
  let mediatorIteratorTransform: MediatorCombinePipeline<
  DummyTransform,
  ActionIteratorTransform,
  IActorTest
  >;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busJoin = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinWrapStream instance', () => {
    let actorWrapStream: ActorRdfJoinWrapStream;
    let action: any;
    let context: IActionContext;
    let calledWithContext: IActionContext;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorJoin = {
        async mediate(a: any) {
          // Record the context it was called with, as jest calledWith looks only at object reference
          // Which is mutated in .run(a), resulting in failing tests that test behavior of mediate
          // correct.
          calledWithContext = a.context;
          return await new ActorRdfJoinNestedLoop(
            { name: 'actor', bus: busJoin, mediatorJoinSelectivity },
          ).run(a, undefined!);
        },
      };
      mediatorIteratorTransform = new MediatorCombinePipeline(
        <any> { name: 'mediator', bus },
      );
      actorTransform1 = new DummyTransform({ name: '1', bus });
      actorTransform2 = new DummyTransform({ name: '2', bus });

      actorWrapStream = new ActorRdfJoinWrapStream(
        { name: 'actor', bus: busJoin, mediatorJoinSelectivity, mediatorJoin, mediatorIteratorTransform },
      );

      context = new ActionContext();
      action = {
        type: 'inner',
        entries: [
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a1') ],
                  [ DF.variable('b'), DF.literal('b1') ],
                ]),
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a2') ],
                  [ DF.variable('b'), DF.literal('b2') ],
                ]),
              ]),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('b') ],
                },
              ),
              type: 'bindings',
            },
            operation: <any> {},
          },
          {
            output: {
              bindingsStream: new ArrayIterator<RDF.Bindings>([
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a1') ],
                  [ DF.variable('c'), DF.literal('c1') ],
                ]),
                BF.bindings([
                  [ DF.variable('a'), DF.literal('a2') ],
                  [ DF.variable('c'), DF.literal('c2') ],
                ]),
              ]),
              metadata: () => Promise.resolve(
                {
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 5 },
                  pageSize: 100,
                  requestTime: 20,
                  canContainUndefs: false,
                  variables: [ DF.variable('a'), DF.variable('c') ],
                },
              ),
              type: 'bindings',
            },
            operation: <any> {},
          },
        ],
        context,
      };
    });

    it('should return correct coefficients', async() => {
      await expect(actorWrapStream.test(action)).resolves.toEqual({
        sideData: {
          metadatas: [
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 4 },
              pageSize: 100,
              requestTime: 10,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('b') ],
            },
            {
              state: new MetadataValidationState(),
              cardinality: { type: 'estimate', value: 5 },
              pageSize: 100,
              requestTime: 20,
              canContainUndefs: false,
              variables: [ DF.variable('a'), DF.variable('c') ],
            },
          ],
        },
        value: {
          iterations: -1,
          persistedItems: -1,
          blockingItems: -1,
          requestTime: -1,
        },
      });
    });

    it('should reject test if wrap context key is set', async() => {
      action.context = action.context.set(KEY_CONTEXT_WRAPPED_RDF_JOIN, action.entries);
      await expect(actorWrapStream.test(action))
        .resolves.toEqual(failTest('Unable to wrap join operation multiple times'));
    });

    it('should set wrapped to true during run', async() => {
      await actorWrapStream.run(action, undefined!);
      expect(calledWithContext).toEqual(
        new ActionContext({ [KEY_CONTEXT_WRAPPED_RDF_JOIN.name]: action.entries }),
      );
    });

    it('should correctly invoke transform actors on join result', async() => {
      const output = await actorWrapStream.run(action, undefined!);
      const transformedData = await output.bindingsStream.toArray();

      expect(actorTransform1.transformCalls).toBe(2);
      expect(actorTransform2.transformCalls).toBe(2);

      expect(transformedData).toHaveLength(2);
      expect(transformedData[0].has(DF.variable('a'))).toBeTruthy();
      expect(transformedData[0].has(DF.variable('c'))).toBeTruthy();
    });

    it('should handle undefined context from mediatorJoin', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          type: 'bindings',
          operation: 'inner',
          stream: action.bindingsStream,
          metadata: action.metadata,
          context: new ActionContext(),
          originalAction: action,
        },
      );
      const _mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindings',
          bindingsStream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: async() => {
            return {};
          },
          context: undefined,
        },
      );
      const _output = await actorWrapStream.run(action, undefined!);
      // Some problem because action gets modified, should probably make the action a shallow copy
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
          type: 'bindings',
          operation: 'inner',
          stream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: expect.any(Function),
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, action.entries),
          originalAction: action,
        },
      );
    });
    it('should handle join result context', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          type: 'bindings',
          operation: 'inner',
          stream: action.bindingsStream,
          metadata: action.metadata,
          context: new ActionContext(),
          originalAction: action,
        },
      );
      const _mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindings',
          bindingsStream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: async() => {
            return {};
          },
          context: new ActionContext({ a: 'contextValue' }),
        },
      );
      const _output = await actorWrapStream.run(action, undefined!);
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
          type: 'bindings',
          operation: 'inner',
          stream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: expect.any(Function),
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, action.entries),
          originalAction: action,
        },
      );
    });
    it('should correctly pass through metadata from mediatorJoin', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          type: 'bindings',
          operation: 'inner',
          stream: action.bindingsStream,
          metadata: action.metadata,
          context: new ActionContext(),
          originalAction: action,
        },
      );
      const _mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindings',
          bindingsStream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: async() => {
            return { a: 'value1', b: 'value2' };
          },
          context: new ActionContext(),
        },
      );
      const _output = await actorWrapStream.run(action, undefined!);
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
          type: 'bindings',
          operation: 'inner',
          stream: new ArrayIterator<RDF.Bindings>([
            BF.bindings([
              [ DF.variable('a'), DF.literal('a1') ],
              [ DF.variable('c'), DF.literal('c1') ],
            ]),
            BF.bindings([
              [ DF.variable('a'), DF.literal('a2') ],
              [ DF.variable('c'), DF.literal('c2') ],
            ]),
          ]),
          metadata: expect.any(Function),
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, action.entries),
          originalAction: action,
        },
      );
    });
  });
});
