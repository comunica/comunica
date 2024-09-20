import { ActorRdfJoinNestedLoop } from '@comunica/actor-rdf-join-inner-nestedloop';
import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  IActionIteratorTransform,
  ITransformIteratorOutput,
} from '@comunica/bus-iterator-transform';
import {
  ActorIteratorTransform,
} from '@comunica/bus-iterator-transform';
import { KEY_CONTEXT_WRAPPED_RDF_JOIN } from '@comunica/bus-rdf-join';
import type {
  IActionRdfJoinSelectivity,
  IActorRdfJoinSelectivityOutput }
  from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MediatorCombinePipeline } from '@comunica/mediator-combine-pipeline';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinWrapStream } from '../lib/ActorRdfJoinWrapStream';

const DF = new DataFactory();
const BF = new BindingsFactory();

class DummyTransform extends ActorIteratorTransform<AsyncIterator<RDF.Bindings>
| AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads> {
  public transformCalls = 0;

  public async transformIterator<
  T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
  M extends MetadataBindings | MetadataQuads,
  >(
    action: IActionIteratorTransform<T, M>,
  ): Promise<ITransformIteratorOutput<T, M>> {
    // Return unchanged
    const transformedStream = <T> action.stream.map((data: RDF.Bindings | RDF.Quad) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, streamMetadata: action.streamMetadata };
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
  IActionIteratorTransform<
    AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
    MetadataBindings | MetadataQuads
  >,
  IActorTest
  >;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busJoin = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinWrapStream instance', () => {
    let actorWrapStream: ActorRdfJoinWrapStream;
    let action2: any;
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
          ).run(a);
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
      action2 = {
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

    it('should test', async() => {
      await expect(actorWrapStream.test(action2)).resolves.toEqual({
        iterations: -1,
        persistedItems: -1,
        blockingItems: -1,
        requestTime: -1,
      });
    });

    it('should reject test if wrap context key is set', async() => {
      action2.context = action2.context.set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true);
      await expect(actorWrapStream.test(action2))
        .rejects.toThrow('Unable to wrap join operation multiple times');
    });

    it('should set wrapped to true during run', async() => {
      await actorWrapStream.run(action2);
      expect(calledWithContext).toEqual(
        new ActionContext({ [KEY_CONTEXT_WRAPPED_RDF_JOIN.name]: true }),
      );
    });

    it('should correctly invoke transform actors on join result', async() => {
      const output = await actorWrapStream.run(action2);
      await output.bindingsStream.toArray();

      expect(actorTransform1.transformCalls).toBe(2);
      expect(actorTransform2.transformCalls).toBe(2);
    });

    it('should handle undefined context from mediatorJoin', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          operation: 'inner',
          stream: action2.bindingsStream,
          streamMetadata: action2.streamMetadata,
          context: new ActionContext(),
        },
      );
      const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindingsTest',
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
      const output = await actorWrapStream.run(action2);
      // Some problem because action gets modified, should probably make the action a shallow copy
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
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
          streamMetadata: expect.any(Function),
          metadata: {
            joinEntries: 2,
            resultContext: undefined,
          },
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
        },
      );
    });
    it('should handle join result context', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          operation: 'inner',
          stream: action2.bindingsStream,
          streamMetadata: action2.streamMetadata,
          context: new ActionContext(),
        },
      );
      const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindingsTest',
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
      const output = await actorWrapStream.run(action2);
      // Some problem because action gets modified, should probably make the action a shallow copy
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
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
          streamMetadata: expect.any(Function),
          metadata: {
            joinEntries: 2,
            resultContext: new ActionContext({ a: 'contextValue' }),
          },
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
        },
      );
    });
    it('should correctly pass through metadata from mediatorJoin', async() => {
      const mockedMediatorTransformIterator = jest.spyOn(
        mediatorIteratorTransform,
        'mediate',
      ).mockResolvedValue(
        {
          operation: 'inner',
          stream: action2.bindingsStream,
          streamMetadata: action2.streamMetadata,
          context: new ActionContext(),
        },
      );
      const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
        {
          type: 'bindingsTest',
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
      const output = await actorWrapStream.run(action2);
      // Some problem because action gets modified, should probably make the action a shallow copy
      expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
        {
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
          streamMetadata: expect.any(Function),
          metadata: {
            joinEntries: 2,
            a: 'value1',
            b: 'value2',
            resultContext: new ActionContext(),
          },
          context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
        },
      );
    });
  });
});
