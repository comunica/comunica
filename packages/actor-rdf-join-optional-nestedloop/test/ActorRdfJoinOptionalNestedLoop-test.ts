import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ExpressionError } from '@comunica/utils-expression-evaluator';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinOptionalNestedLoop } from '../lib/ActorRdfJoinOptionalNestedLoop';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const FACTORY = new AlgebraFactory();

describe('ActorRdfJoinOptionalNestedLoop', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorRdfJoinOptionalNestedLoop instance', () => {
    let mediatorJoinSelectivity: Mediator<
    Actor<IActionRdfJoinSelectivity, IActorTest, IActorRdfJoinSelectivityOutput>,
    IActionRdfJoinSelectivity,
IActorTest,
IActorRdfJoinSelectivityOutput
>;
    let actor: ActorRdfJoinOptionalNestedLoop;

    beforeEach(() => {
      mediatorJoinSelectivity = <any> {
        mediate: async() => ({ selectivity: 1 }),
      };
      actor = new ActorRdfJoinOptionalNestedLoop({ name: 'actor', bus, mediatorJoinSelectivity });
    });

    describe('test', () => {
      it('should not test on zero entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: [],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on one entry', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}],
          context,
        })).resolves.toFailTest('actor requires at least two join entries.');
      });

      it('should not test on three entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [{}, {}, {}],
          context,
        })).resolves.toFailTest('actor requires 2 join entries at most. The input contained 3.');
      });

      it('should not test on a non-optional operation', async() => {
        await expect(actor.test({
          type: 'inner',
          entries: <any> [{}, {}],
          context,
        })).resolves.toFailTest(`actor can only handle logical joins of type 'optional', while 'inner' was given.`);
      });

      it('should test on two entries', async() => {
        await expect(actor.test({
          type: 'optional',
          entries: <any> [
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                }),
              },
            },
            {
              output: {
                type: 'bindings',
                metadata: () => Promise.resolve({
                  cardinality: { type: 'estimate', value: 4 },
                  pageSize: 100,
                  requestTime: 10,
                }),
              },
            },
          ],
          context,
        })).resolves.toPassTest({
          iterations: 16,
          blockingItems: 0,
          persistedItems: 0,
          requestTime: 0.8,
        });
      });
    });

    describe('run', () => {
      it('should handle two entries', async() => {
        const action: IActionRdfJoin = {
          type: 'optional',
          entries: [
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
                  BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
            {
              output: {
                bindingsStream: new ArrayIterator<RDF.Bindings>([
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('1') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('1') ],
                  ]),
                  BF.bindings([
                    [ DF.variable('a'), DF.literal('3') ],
                    [ DF.variable('b'), DF.literal('2') ],
                  ]),
                ], { autoStart: false }),
                metadata: () => Promise.resolve({
                  state: new MetadataValidationState(),
                  cardinality: { type: 'estimate', value: 3 },

                  variables: [
                    { variable: DF.variable('a'), canBeUndef: false },
                    { variable: DF.variable('b'), canBeUndef: false },
                  ],
                }),
                type: 'bindings',
              },
              operation: <any> {},
            },
          ],
          context,
        };
        const result = await actor.run(action, undefined!);

        // Validate output
        expect(result.type).toBe('bindings');
        await expect(result.metadata()).resolves
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 3 },
            variables: [
              { variable: DF.variable('a'), canBeUndef: false },
              { variable: DF.variable('b'), canBeUndef: true },
            ],
          });
        await expect(result.bindingsStream).toEqualBindingsStream([
          BF.bindings([
            [ DF.variable('a'), DF.literal('1') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('2') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('1') ],
          ]),
          BF.bindings([
            [ DF.variable('a'), DF.literal('3') ],
            [ DF.variable('b'), DF.literal('2') ],
          ]),
        ]);
      });
    });
  });
  describe('An ActorRdfJoinOptionalNestedLoop instance with an expression evaluator', () => {
    let actor: ActorRdfJoinOptionalNestedLoop;
    let evaluateAsEBV: jest.Mock;
    let mediatorExpressionEvaluatorFactory: any;
    const expression = FACTORY.createTermExpression(DF.literal('true'));

    function metadata(cardinality: number, variables: string[]): () => Promise<any> {
      return () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'estimate', value: cardinality },
        variables: variables.map(name => ({ variable: DF.variable(name), canBeUndef: false })),
      });
    }

    function makeAction(options: {
      expression?: any;
      left?: RDF.Bindings[];
      right?: RDF.Bindings[];
    } = {}): IActionRdfJoin {
      return {
        type: 'optional',
        entries: [
          {
            output: {
              type: 'bindings',
              bindingsStream: new ArrayIterator<RDF.Bindings>(options.left ?? [], { autoStart: false }),
              metadata: metadata(2, [ 'a', 'id' ]),
            },
            operation: <any> {},
          },
          {
            output: {
              type: 'bindings',
              bindingsStream: new ArrayIterator<RDF.Bindings>(options.right ?? [], { autoStart: false }),
              metadata: metadata(3, [ 't', 'id2' ]),
            },
            operation: <any> {},
          },
        ],
        context,
        expression: options.expression ?? expression,
      };
    }

    beforeEach(() => {
      evaluateAsEBV = jest.fn(async(bindings: RDF.Bindings) =>
        bindings.get('id')!.value === bindings.get('id2')!.value);
      mediatorExpressionEvaluatorFactory = {
        mediate: jest.fn(async() => ({ evaluateAsEBV })),
      };
      actor = new ActorRdfJoinOptionalNestedLoop({
        name: 'actor',
        bus,
        mediatorJoinSelectivity: <any> { mediate: async() => ({ selectivity: 1 }) },
        mediatorExpressionEvaluatorFactory,
      });
    });

    describe('test', () => {
      it('should not test on an expression without expression evaluator', async() => {
        actor = new ActorRdfJoinOptionalNestedLoop({
          name: 'actor',
          bus,
          mediatorJoinSelectivity: <any> { mediate: async() => ({ selectivity: 1 }) },
        });
        await expect(actor.test(makeAction()))
          .resolves.toFailTest('actor can not handle join expressions.');
      });

      it('should test on an expression', async() => {
        await expect(actor.test(makeAction())).resolves.toPassTest({
          iterations: 6,
          blockingItems: 0,
          persistedItems: 0,
          requestTime: 0,
        });
      });
    });

    describe('run', () => {
      const left = [
        BF.bindings([[ DF.variable('a'), DF.literal('a1') ], [ DF.variable('id'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('a2') ], [ DF.variable('id'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('a3') ], [ DF.variable('id'), DF.literal('3') ]]),
      ];
      const right = [
        BF.bindings([[ DF.variable('t'), DF.literal('t1') ], [ DF.variable('id2'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('t'), DF.literal('t2') ], [ DF.variable('id2'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('t'), DF.literal('t2b') ], [ DF.variable('id2'), DF.literal('2') ]]),
      ];

      it('should keep joined bindings for which the expression holds, and unmatched left bindings', async() => {
        const result = await actor.run(makeAction({ left, right }), undefined!);

        await expect(result.bindingsStream).toEqualBindingsStream([
          left[0].merge(right[0])!,
          left[1].merge(right[1])!,
          left[1].merge(right[2])!,
          left[2],
        ]);
        expect(mediatorExpressionEvaluatorFactory.mediate).toHaveBeenCalledWith({ algExpr: expression, context });
        await expect(result.metadata()).resolves.toEqual(expect.objectContaining({
          cardinality: { type: 'estimate', value: 6 },
        }));
      });

      it('should treat expression errors as false and log them', async() => {
        const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
        evaluateAsEBV.mockImplementation(async() => {
          throw new ExpressionError('expression error');
        });
        const result = await actor.run(makeAction({ left, right }), undefined!);

        await expect(result.bindingsStream).toEqualBindingsStream(left);
        expect(logWarnSpy).toHaveBeenCalledWith(
          context,
          'Error occurred while evaluating a join expression.',
          expect.any(Function),
        );
        const logData = (<() => { error: Error }> logWarnSpy.mock.calls[0][2])();
        expect(logData.error).toEqual(new ExpressionError('expression error'));
      });

      it('should emit other errors', async() => {
        evaluateAsEBV.mockImplementation(async() => {
          throw new Error('other error');
        });
        const result = await actor.run(makeAction({ left, right }), undefined!);

        await expect(result.bindingsStream.toArray()).rejects.toThrow('other error');
      });

      it('should skip incompatible bindings', async() => {
        const incompatibleRight = [
          BF.bindings([[ DF.variable('a'), DF.literal('other') ], [ DF.variable('id2'), DF.literal('1') ]]),
        ];
        const result = await actor.run(makeAction({ left, right: incompatibleRight }), undefined!);

        await expect(result.bindingsStream).toEqualBindingsStream(left);
        expect(evaluateAsEBV).not.toHaveBeenCalled();
      });
    });
  });
});
