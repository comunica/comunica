import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  ActionIteratorTransform,
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuads,
  ITransformIteratorOutput,
} from '@comunica/bus-iterator-transform';
import {
  ActorIteratorTransform,
} from '@comunica/bus-iterator-transform';
import { KEY_CONTEXT_WRAPPED_QUERY_OPERATION } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoinSelectivity,
  IActorRdfJoinSelectivityOutput }
  from '@comunica/bus-rdf-join-selectivity';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { MediatorCombinePipeline } from '@comunica/mediator-combine-pipeline';
import { MetadataValidationState } from '@comunica/metadata';
import type {
  IActionContext,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
  MetadataBindings,
  MetadataQuads,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MappingIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { types } from 'sparqlalgebrajs/lib/algebra';
import { ActorQueryOperationWrapStream } from '../lib/ActorQueryOperationWrapStream';

const DF = new DataFactory();
const BF = new BindingsFactory();

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
}

describe('ActorQueryOperationWrapStream', () => {
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
  let mediatorQueryOperation: any;
  let mediatorIteratorTransform: MediatorCombinePipeline<
   DummyTransform,
   ActionIteratorTransform,
   IActorTest
   >;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busJoin = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryOperationWrapStream instance', () => {
    let actorWrapStream: ActorQueryOperationWrapStream;
    let actionBindings: any;
    let actionQuads: any;
    let context: IActionContext;
    let calledWithContext: IActionContext;
    let bsOutput: AsyncIterator<RDF.Bindings>;
    let quadOutput: AsyncIterator<RDF.Quad>;

    beforeEach(() => {
      bsOutput = new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.literal('a1') ],
          [ DF.variable('b'), DF.literal('b1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.literal('a2') ],
          [ DF.variable('b'), DF.literal('b2') ],
        ]),
      ]);
      quadOutput = new ArrayIterator<RDF.Quad>([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
      ]);

      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      mediatorQueryOperation = {
        async mediate(a: any): Promise<IQueryOperationResultQuads | IQueryOperationResultBindings> {
          // Record the context it was called with, as jest calledWith looks only at object reference
          // Which is mutated in .run(a), resulting in failing tests that test behavior of mediate
          // correct.
          calledWithContext = a.context;
          if (a.type === 'bindings') {
            return {
              type: 'bindings',
              metadata: async() => {
                return {
                  cardinality: { value: 3, type: 'estimate' },
                  canContainUndefs: true,
                  variables: [ DF.variable('a') ],
                  state: new MetadataValidationState(),
                };
              },
              bindingsStream: bsOutput,
            };
          }
          return {
            type: 'quads',
            metadata: async() => {
              return {
                cardinality: { value: 3, type: 'estimate' },
                canContainUndefs: true,
                variables: [ DF.variable('a') ],
                state: new MetadataValidationState(),
              };
            },
            quadStream: quadOutput,
          };
        },
      };

      mediatorIteratorTransform = new MediatorCombinePipeline(<any> { name: 'mediator', bus });
      actorTransform1 = new DummyTransform({ name: '1', bus });
      actorTransform2 = new DummyTransform({ name: '2', bus });

      actorWrapStream = new ActorQueryOperationWrapStream({
        name: 'actor',
        bus: busJoin,
        mediatorQueryOperation,
        mediatorIteratorTransform,
      });

      context = new ActionContext();
      actionBindings = {
        type: 'bindings',
        operation: {
          type: types.NOP,
        },
        context: new ActionContext(),
      };
      actionQuads = {
        type: 'quads',
        operation: {
          type: types.NOP,
        },
        context: new ActionContext(),
      };
    });

    it('should test', async() => {
      await expect(actorWrapStream.test(actionBindings)).resolves.toEqual({
        httpRequests: Number.NEGATIVE_INFINITY,
      });
    });

    it('should reject test if wrap context key is set to wraped operation', async() => {
      actionBindings.context = actionBindings.context.set(
        KEY_CONTEXT_WRAPPED_QUERY_OPERATION,
        actionBindings.operation,
      );
      await expect(actorWrapStream.test(actionBindings))
        .rejects.toThrow('Unable to wrap query source multiple times');
    });

    it('should set wrapped to wraped operation during run', async() => {
      await actorWrapStream.run(actionBindings);
      expect(calledWithContext).toEqual(
        new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: actionBindings.operation }),
      );
    });

    describe('binding output', () => {
      it('should run', async() => {
        const output: IQueryOperationResultBindings =
        <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(output).toEqual({
          type: 'bindings',
          bindingsStream: expect.any(MappingIterator),
          metadata: expect.any(Function),
        });
      });
      it('should correctly invoke transform actors', async() => {
        const output: IQueryOperationResultBindings =
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        await output.bindingsStream.toArray();

        expect(actorTransform1.transformCalls).toBe(2);
        expect(actorTransform2.transformCalls).toBe(2);
      });
      it('should record query operation metadata and context', async() => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate')
          .mockReturnValue({
            type: 'bindings',
            bindingsStream: bsOutput,
            metadata: async() => {
              return { a: 'value1', b: 'value2' };
            },
            context: new ActionContext({ c: 'value3' }),
          });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');

        const output: IQueryOperationResultBindings =
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          type: 'bindings',
          operation: types.NOP,
          stream: bsOutput,
          metadata: expect.any(Function),
          context: new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: actionBindings.operation }),
          originalAction: actionBindings,
        });
      });
      it('should record empty metadata and context', async() => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate')
          .mockReturnValue({
            type: 'bindings',
            bindingsStream: bsOutput,
            metadata: async() => {
              return {};
            },
            context: undefined,
          });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');

        const output: IQueryOperationResultBindings =
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          type: 'bindings',
          operation: types.NOP,
          stream: bsOutput,
          metadata: expect.any(Function),
          context: new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: actionBindings.operation }),
          originalAction: actionBindings,
        });
      });
    });
    describe('quad output', () => {
      it('should run', async() => {
        const output: IQueryOperationResultQuads =
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(output).toEqual({
          type: 'quads',
          quadStream: expect.any(MappingIterator),
          metadata: expect.any(Function),
        });
      });
      it('should correctly invoke transform actors', async() => {
        const output: IQueryOperationResultQuads =
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        await output.quadStream.toArray();

        expect(actorTransform1.transformCalls).toBe(1);
        expect(actorTransform2.transformCalls).toBe(1);
      });
      it('should record query operation metadata and context', async() => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate')
          .mockReturnValue({
            type: 'quads',
            quadStream: quadOutput,
            metadata: async() => {
              return { a: 'value1', b: 'value2' };
            },
            context: new ActionContext({ c: 'value3' }),
          });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');

        const output: IQueryOperationResultQuads =
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          type: 'quads',
          operation: types.NOP,
          stream: quadOutput,
          metadata: expect.any(Function),
          context: new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: actionQuads.operation }),
          originalAction: actionQuads,
        });
      });
      it('should record empty metadata and context', async() => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate')
          .mockReturnValue({
            type: 'quads',
            quadStream: quadOutput,
            metadata: async() => {
              return {};
            },
            context: undefined,
          });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');

        const output: IQueryOperationResultQuads =
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          type: 'quads',
          operation: types.NOP,
          stream: quadOutput,
          metadata: expect.any(Function),
          context: new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: actionQuads.operation }),
          originalAction: actionQuads,
        });
      });
    });
    it('should return input action when unsupported type is given', async() => {
      const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate')
        .mockReturnValue({
          type: 'boolean',
          quadStream: quadOutput,
          metadata: async() => {
            return {};
          },
          context: undefined,
        });
      actionQuads.type = 'boolean';
      const output: IQueryOperationResultQuads =
        <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
      expect(output).toEqual(
        {
          type: 'boolean',
          quadStream: quadOutput,
          metadata: expect.any(Function),
          context: undefined,
        },
      );
    });
  });
});
