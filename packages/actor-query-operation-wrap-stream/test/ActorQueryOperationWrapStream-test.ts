import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  IActionIteratorTransform,
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
import type { IActionContext, IQueryOperationResultBindings, IQueryOperationResultQuads, MetadataBindings, MetadataQuads } from '@comunica/types';
import * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MappingIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { types } from 'sparqlalgebrajs/lib/algebra';
import { ActorQueryOperationWrapStream } from '../lib/ActorQueryOperationWrapStream';
import { NodePath } from '@babel/core';

const DF = new DataFactory();
const BF = new BindingsFactory();

class DummyTransform extends ActorIteratorTransform<AsyncIterator<RDF.Bindings>
| AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads> {
  public transformCalls = 0;

  public transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, M extends MetadataBindings | MetadataQuads>(
    action: IActionIteratorTransform<T, M>,
  ): ITransformIteratorOutput<T, M> {
    // Return unchanged
    const transformedStream = <T> action.stream.map((data: RDF.Bindings | RDF.Quad) => {
      this.transformCalls++;
      return data;
    });
    return { stream: transformedStream, streamMetadata: action.streamMetadata };
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
   IActionIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads>,
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
        DF.quad(DF.namedNode('s1'), 
          DF.namedNode('p1'),
          DF.namedNode('o1'),
          DF.namedNode('g1')
        ),
      ]);

      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      console.log(bsOutput)
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

      actorWrapStream = new ActorQueryOperationWrapStream({ name: 'actor', bus: busJoin, mediatorQueryOperation, mediatorIteratorTransform });

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
      return expect(actorWrapStream.test(actionBindings)).resolves.toEqual({
        httpRequests: Number.NEGATIVE_INFINITY,
      });
    });

    it('should reject test if wrap context key is set', async() => {
      actionBindings.context = actionBindings.context.set(KEY_CONTEXT_WRAPPED_QUERY_OPERATION, true);
      return expect(actorWrapStream.test(actionBindings))
        .rejects.toThrow('Unable to wrap query source multiple times');
    });

    it('should set wrapped to true during run', async() => {
      await actorWrapStream.run(actionBindings);
      expect(calledWithContext).toEqual(new ActionContext({ [KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: true }));
    });

    describe('binding output', () => {
      it('should run', async () => {
        const output: IQueryOperationResultBindings =   
        <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(output).toEqual({
          type: 'bindings',
          bindingsStream: expect.any(MappingIterator),
          metadata: expect.any(Function)
        });
      });
      it('should correctly invoke transform actors', async() => {
        const output: IQueryOperationResultBindings =   
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        await output.bindingsStream.toArray();

        expect(actorTransform1.transformCalls).toBe(2);
        expect(actorTransform2.transformCalls).toBe(2);
      });
      it('should record query operation metadata and context', async () => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate').
          mockReturnValue({
            type: 'bindings',
            bindingsStream: bsOutput,
            metadata: async () => {return {a: 'value1', b: 'value2'}},
            context: new ActionContext({c: 'value3'})
        });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');
        
        const output: IQueryOperationResultBindings =   
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          operation: types.NOP,
          stream: bsOutput,
          streamMetadata: expect.any(Function),
          context: new ActionContext({[KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: true}),
          metadata: {
            type: 'bindings',
            a: 'value1', 
            b: 'value2',
            resultContext: new ActionContext({c: 'value3'})
          }
        });
      })
      it('should record empty metadata and context', async () => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate').
          mockReturnValue({
            type: 'bindings',
            bindingsStream: bsOutput,
            metadata: async () => {return {}},
            context: undefined
        });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');
        
        const output: IQueryOperationResultBindings =   
          <IQueryOperationResultBindings> await actorWrapStream.run(actionBindings);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          operation: types.NOP,
          stream: bsOutput,
          streamMetadata: expect.any(Function),
          context: new ActionContext({[KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: true}),
          metadata: {
            type: 'bindings',
            resultContext: undefined
          }
        });
      });
    });
    describe('quad output', () => {
      it('should run', async () => {
        const output: IQueryOperationResultQuads =   
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(output).toEqual({
          type: 'quads',
          quadStream: expect.any(MappingIterator),
          metadata: expect.any(Function)
        })
      });
      it('should correctly invoke transform actors', async() => {
        const output: IQueryOperationResultQuads =   
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        await output.quadStream.toArray();

        expect(actorTransform1.transformCalls).toBe(1);
        expect(actorTransform2.transformCalls).toBe(1);
      });
      it('should record query operation metadata and context', async () => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate').
          mockReturnValue({
            type: 'quads',
            quadStream: quadOutput,
            metadata: async () => {return {a: 'value1', b: 'value2'}},
            context: new ActionContext({c: 'value3'})
        });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');
        
        const output: IQueryOperationResultQuads =   
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          operation: types.NOP,
          stream: quadOutput,
          streamMetadata: expect.any(Function),
          context: new ActionContext({[KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: true}),
          metadata: {
            type: 'quads',
            a: 'value1', 
            b: 'value2',
            resultContext: new ActionContext({c: 'value3'})
          }
        });
      })
      it('should record empty metadata and context', async () => {
        const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate').
          mockReturnValue({
            type: 'quads',
            quadStream: quadOutput,
            metadata: async () => {return {}},
            context: undefined
        });
        const spyIteratorTransform = jest.spyOn(mediatorIteratorTransform, 'mediate');
        
        const output: IQueryOperationResultQuads =   
          <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
        expect(spyIteratorTransform).toHaveBeenCalledWith({
          operation: types.NOP,
          stream: quadOutput,
          streamMetadata: expect.any(Function),
          context: new ActionContext({[KEY_CONTEXT_WRAPPED_QUERY_OPERATION.name]: true}),
          metadata: {
            type: 'quads',
            resultContext: undefined
          }
        });
      });
    });
    it('should return input action when unsupported type is given', async () => {
      const spyQueryOperation = jest.spyOn(mediatorQueryOperation, 'mediate').
      mockReturnValue({
        type: 'boolean',
        quadStream: quadOutput,
        metadata: async () => {return {}},
        context: undefined
      });
      actionQuads.type = 'void'
      const output: IQueryOperationResultQuads =   
        <IQueryOperationResultQuads> await actorWrapStream.run(actionQuads);
      expect(output).toEqual(
        {
          type: 'boolean',
          quadStream: quadOutput,
          metadata: expect.any(Function),
          context: undefined
        }
      );
    });



    // It('should handle undefined context from mediatorJoin', async() => {
    //   const mockedMediatorTransformIterator = jest.spyOn(mediatorIteratorTransform, 'mediate').mockResolvedValue(
    //     {
    //       operation: 'inner',
    //       stream: actionBindings.bindingsStream,
    //       streamMetadata: actionBindings.streamMetadata,
    //       context: new ActionContext(),
    //     },
    //   );
    //   const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
    //     {
    //       type: 'bindingsTest',
    //       bindingsStream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       metadata: async() => {
    //         return {};
    //       },
    //       context: undefined,
    //     },
    //   );
    //   const output = await actorWrapStream.run(actionBindings);
    //   // Some problem because action gets modified, should probably make the action a shallow copy
    //   expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
    //     {
    //       operation: 'inner',
    //       stream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       streamMetadata: expect.any(Function),
    //       metadata: {
    //         joinEntries: 2,
    //         resultContext: undefined,
    //       },
    //       context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
    //     },
    //   );
    // });
    // it('should handle join result context', async() => {
    //   const mockedMediatorTransformIterator = jest.spyOn(mediatorIteratorTransform, 'mediate').mockResolvedValue(
    //     {
    //       operation: 'inner',
    //       stream: actionBindings.bindingsStream,
    //       streamMetadata: actionBindings.streamMetadata,
    //       context: new ActionContext(),
    //     },
    //   );
    //   const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
    //     {
    //       type: 'bindingsTest',
    //       bindingsStream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       metadata: async() => {
    //         return {};
    //       },
    //       context: new ActionContext({ a: 'contextValue' }),
    //     },
    //   );
    //   const output = await actorWrapStream.run(actionBindings);
    //   // Some problem because action gets modified, should probably make the action a shallow copy
    //   expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
    //     {
    //       operation: 'inner',
    //       stream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       streamMetadata: expect.any(Function),
    //       metadata: {
    //         joinEntries: 2,
    //         resultContext: new ActionContext({ a: 'contextValue' }),
    //       },
    //       context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
    //     },
    //   );
    // });
    // it('should correctly pass through metadata from mediatorJoin', async() => {
    //   const mockedMediatorTransformIterator = jest.spyOn(mediatorIteratorTransform, 'mediate').mockResolvedValue(
    //     {
    //       operation: 'inner',
    //       stream: actionBindings.bindingsStream,
    //       streamMetadata: actionBindings.streamMetadata,
    //       context: new ActionContext(),
    //     },
    //   );
    //   const mockedMediatorJoin = jest.spyOn(mediatorJoin, 'mediate').mockResolvedValue(
    //     {
    //       type: 'bindingsTest',
    //       bindingsStream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       metadata: async() => {
    //         return { a: 'value1', b: 'value2' };
    //       },
    //       context: new ActionContext(),
    //     },
    //   );
    //   const output = await actorWrapStream.run(actionBindings);
    //   // Some problem because action gets modified, should probably make the action a shallow copy
    //   expect(mockedMediatorTransformIterator).toHaveBeenCalledWith(
    //     {
    //       operation: 'inner',
    //       stream: new ArrayIterator<RDF.Bindings>([
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a1') ],
    //           [ DF.variable('c'), DF.literal('c1') ],
    //         ]),
    //         BF.bindings([
    //           [ DF.variable('a'), DF.literal('a2') ],
    //           [ DF.variable('c'), DF.literal('c2') ],
    //         ]),
    //       ]),
    //       streamMetadata: expect.any(Function),
    //       metadata: {
    //         joinEntries: 2,
    //         a: 'value1',
    //         b: 'value2',
    //         resultContext: new ActionContext(),
    //       },
    //       context: new ActionContext().set(KEY_CONTEXT_WRAPPED_RDF_JOIN, true),
    //     },
    //   );
    // });
  });
});
