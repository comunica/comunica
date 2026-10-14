import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource, getOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationGroupSources } from '../lib/ActorOptimizeQueryOperationGroupSources';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationGroupSources', () => {
  let bus: any;

  const source1: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'wildcard',
        },
      }),
    },
  };
  const source2: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source2',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'wildcard',
        },
      }),
    },
  };
  const sourcePattern: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.PATTERN,
        },
      }),
    },
  };

  const ctx = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationGroupSources instance', () => {
    let actor: ActorOptimizeQueryOperationGroupSources;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationGroupSources({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should handle operations without top-level source', async() => {
        await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() })).resolves.toPassTestVoid();
      });

      it('should not handle operations with top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: assignOperationSource(AF.createNop(), <any>{}),
        })).resolves.toFailTest(`Actor actor does not work with top-level operation sources.`);
      });
    });

    describe('run', () => {
      it('should group a join operation', async() => {
        const opIn = AF.createJoin([
          assignOperationSource(
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
            source1,
          ),
          assignOperationSource(
            AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
            source2,
          ),
          assignOperationSource(
            AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
            source1,
          ),
        ]);
        const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
        expect(opOut).toEqual(AF.createJoin([
          assignOperationSource(
            AF.createJoin([
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
            ]),
            source1,
          ),
          assignOperationSource(
            AF.createJoin([
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
            ]),
            source2,
          ),
        ], false));
      });
    });

    describe('groupOperation', () => {
      it('should return the original operation if annotated with a source', async() => {
        const opIn = assignOperationSource(AF.createNop(), source1);
        await expect(actor.groupOperation(opIn, ctx)).resolves.toBe(opIn);
      });

      it('should return the original operation if it has no input', async() => {
        const opIn = AF.createNop();
        await expect(actor.groupOperation(opIn, ctx)).resolves.toBe(opIn);
      });

      describe('for a singular operation', () => {
        it('should group a singular sub-input for OrderBy if the source accepts it', async() => {
          const opIn = AF.createOrderBy(
            assignOperationSource(
              AF.createPattern(DF.namedNode('s'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            [],
          );
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(assignOperationSource(
            AF.createOrderBy(
              AF.createPattern(DF.namedNode('s'), DF.namedNode('s'), DF.namedNode('s')),
              [],
            ),
            source1,
          ));
        });

        it('should not group a singular sub-input for OrderBy if the source does not accept it', async() => {
          const opIn = AF.createOrderBy(
            assignOperationSource(
              AF.createPattern(DF.namedNode('s'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
            [],
          );
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(
            AF.createOrderBy(
              assignOperationSource(
                AF.createPattern(DF.namedNode('s'), DF.namedNode('s'), DF.namedNode('s')),
                sourcePattern,
              ),
              [],
            ),
          );
        });
      });

      describe('for a join operation', () => {
        it('should group patterns with equal sources if the source accepts it', async() => {
          const opIn = AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(assignOperationSource(
            AF.createJoin([
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
            ]),
            source1,
          ));
        });

        it('should not group patterns with different sources', async() => {
          const opIn = AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
          ]));
        });

        it('should not group patterns with equal sources if the source does not accepts it', async() => {
          const opIn = AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
          ]));
        });

        it('should cluster patterns with equal sources', async() => {
          const opIn = AF.createJoin([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createJoin([
            assignOperationSource(
              AF.createJoin([
                AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
                AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
              ]),
              source1,
            ),
            assignOperationSource(
              AF.createJoin([
                AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              ]),
              source2,
            ),
          ], false));
        });
      });

      describe('for a union operation', () => {
        it('should group patterns with equal sources if the source accepts it', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(assignOperationSource(
            AF.createUnion([
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
            ]),
            source1,
          ));
        });

        it('should not group patterns with different sources', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
          ]));
        });

        it('should not group patterns with equal sources if the source does not accepts it', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              sourcePattern,
            ),
          ]));
        });

        it('should cluster patterns with equal sources', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              source2,
            ),
            assignOperationSource(
              AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(
              AF.createUnion([
                AF.createPattern(DF.namedNode('s1'), DF.namedNode('s'), DF.namedNode('s')),
                AF.createPattern(DF.namedNode('s3'), DF.namedNode('s'), DF.namedNode('s')),
              ]),
              source1,
            ),
            assignOperationSource(
              AF.createUnion([
                AF.createPattern(DF.namedNode('s2'), DF.namedNode('s'), DF.namedNode('s')),
              ]),
              source2,
            ),
          ], false));
        });
      });

      describe('for an alt operation', () => {
        it('should cluster patterns with equal sources', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(
              AF.createLink(DF.namedNode('s1')),
              source1,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s2')),
              source2,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s3')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(
              AF.createAlt([
                AF.createLink(DF.namedNode('s1')),
                AF.createLink(DF.namedNode('s3')),
              ]),
              source1,
            ),
            assignOperationSource(
              AF.createAlt([
                AF.createLink(DF.namedNode('s2')),
              ]),
              source2,
            ),
          ], false));
        });
      });

      describe('for a seq operation', () => {
        it('should cluster patterns with equal sources', async() => {
          const opIn = AF.createSeq([
            assignOperationSource(
              AF.createLink(DF.namedNode('s1')),
              source1,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s2')),
              source2,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s3')),
              source1,
            ),
          ]);
          const opOut = await actor.groupOperation(opIn, ctx);
          expect(opOut).toEqual(AF.createSeq([
            assignOperationSource(
              AF.createSeq([
                AF.createLink(DF.namedNode('s1')),
                AF.createLink(DF.namedNode('s3')),
              ]),
              source1,
            ),
            assignOperationSource(
              AF.createSeq([
                AF.createLink(DF.namedNode('s2')),
              ]),
              source2,
            ),
          ], false));
        });
      });

      it('throws for unknown operations', async() => {
        const opIn: any = {
          type: 'unknown',
          input: [
            assignOperationSource(
              AF.createLink(DF.namedNode('s1')),
              source1,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s2')),
              source2,
            ),
            assignOperationSource(
              AF.createLink(DF.namedNode('s3')),
              source1,
            ),
          ],
        };
        await expect(actor.groupOperation(opIn, ctx)).rejects
          .toThrow(`Unsupported operation 'unknown' detected while grouping sources`);
      });
    });

    describe('clusterOperationsWithEqualSources', () => {
      it('should handle an empty array', () => {
        expect(actor.clusterOperationsWithEqualSources([]))
          .toEqual([]);
      });

      it('should a single operation without source', () => {
        expect(actor.clusterOperationsWithEqualSources([
          AF.createNop(),
        ])).toEqual([
          [
            AF.createNop(),
          ],
        ]);
      });

      it('should multiple operations without source', () => {
        expect(actor.clusterOperationsWithEqualSources([
          AF.createNop(),
          AF.createNop(),
          AF.createNop(),
        ])).toEqual([
          [
            AF.createNop(),
            AF.createNop(),
            AF.createNop(),
          ],
        ]);
      });

      it('should a single operation with source', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        expect(actor.clusterOperationsWithEqualSources([
          op1,
        ])).toEqual([
          [
            op1,
          ],
        ]);
      });

      it('should multiple operations with equal source', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source1);
        const op3 = assignOperationSource(AF.createNop(), source1);
        expect(actor.clusterOperationsWithEqualSources([
          op1,
          op2,
          op3,
        ])).toEqual([
          [
            op1,
            op2,
            op3,
          ],
        ]);
      });

      it('should multiple operations with all different sources', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source2);
        const op3 = assignOperationSource(AF.createNop(), sourcePattern);
        expect(actor.clusterOperationsWithEqualSources([
          op1,
          op2,
          op3,
        ])).toEqual([
          [ op1 ],
          [ op2 ],
          [ op3 ],
        ]);
      });

      it('should multiple operations with some common sources', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source1);
        const op3 = assignOperationSource(AF.createNop(), source2);
        const op4 = assignOperationSource(AF.createNop(), source2);
        expect(actor.clusterOperationsWithEqualSources([
          op1,
          op2,
          op3,
          op4,
        ])).toEqual([
          [ op1, op2 ],
          [ op3, op4 ],
        ]);
      });

      it('should multiple operations with some common sources and some no sources', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source1);
        const op3 = assignOperationSource(AF.createNop(), source2);
        const op4 = assignOperationSource(AF.createNop(), source2);
        const op5 = AF.createNop();
        const op6 = AF.createNop();
        expect(actor.clusterOperationsWithEqualSources([
          op1,
          op2,
          op3,
          op4,
          op5,
          op6,
        ])).toEqual([
          [ op5, op6 ],
          [ op1, op2 ],
          [ op3, op4 ],
        ]);
      });

      it('should multiple operations with some common sources and some no sources in mixed order', () => {
        const op1 = assignOperationSource(AF.createNop(), source1);
        const op2 = assignOperationSource(AF.createNop(), source1);
        const op3 = assignOperationSource(AF.createNop(), source2);
        const op4 = assignOperationSource(AF.createNop(), source2);
        const op5 = AF.createNop();
        const op6 = AF.createNop();
        expect(actor.clusterOperationsWithEqualSources([
          op1,
          op3,
          op5,
          op2,
          op4,
          op6,
        ])).toEqual([
          [ op5, op6 ],
          [ op1, op2 ],
          [ op3, op4 ],
        ]);
      });
    });

    describe('moveSourceAnnotationUpwardsIfPossible', () => {
      it('should return the grouped operation for a undefined source', async() => {
        const grouped = AF.createUnion([]);
        await expect(actor.moveSourceAnnotationUpwardsIfPossible(
          grouped,
          [],
          undefined,
          new ActionContext(),
        )).resolves.toBe(grouped);
      });

      it('should return the grouped operation for a source that does not accept it', async() => {
        const grouped = AF.createUnion([]);
        await expect(actor.moveSourceAnnotationUpwardsIfPossible(
          grouped,
          [],
          sourcePattern,
          new ActionContext(),
        )).resolves.toBe(grouped);
      });

      it('should return the grouped operation for a source that does accept it', async() => {
        const grouped = AF.createUnion([]);
        const inputs = [
          assignOperationSource(AF.createNop(), source1),
          assignOperationSource(AF.createNop(), source1),
        ];
        const out = await actor.moveSourceAnnotationUpwardsIfPossible(
          grouped,
          inputs,
          source1,
          new ActionContext(),
        );
        expect(out).not.toBe(grouped);
        expect(out).toEqual(assignOperationSource(AF.createUnion([]), source1));
        expect(getOperationSource(out)).toBe(source1);
        expect(getOperationSource(inputs[0])).toBeUndefined();
        expect(getOperationSource(inputs[1])).toBeUndefined();
      });
    });

    describe('isPossibleToMoveSourceAnnotationUpwards', () => {
      it('should return true for supported shape without extension functions', () => {
        const ctx = new ActionContext();
        expect(actor.isPossibleToMoveSourceAnnotationUpwards(
          AF.createNop(),
          { type: 'operation', operation: { operationType: 'wildcard' }},
          ctx,
        )).toBeTruthy();
      });

      it('should return true for supported shape with extension functions on non-expression', () => {
        const ctx = new ActionContext({ [KeysInitQuery.extensionFunctions.name]: {}});
        expect(actor.isPossibleToMoveSourceAnnotationUpwards(
          AF.createNop(),
          { type: 'operation', operation: { operationType: 'wildcard' }},
          ctx,
        )).toBeTruthy();
      });

      it('should return true for supported shape with extension functions on local named expression', () => {
        const ctx = new ActionContext({ [KeysInitQuery.extensionFunctions.name]: {
          'ex:f': true,
        }});
        expect(actor.isPossibleToMoveSourceAnnotationUpwards(
          AF.createFilter(AF.createNop(), AF.createNamedExpression(DF.namedNode('ex:f'), [])),
          {
            type: 'disjunction',
            children: [
              { type: 'operation', operation: { operationType: 'wildcard' }},
              {
                type: 'operation',
                operation: { operationType: 'type', type: Algebra.Types.EXPRESSION, extensionFunctions: [ 'ex:f' ]},
              },
            ],
          },
          ctx,
        )).toBeTruthy();
      });

      it('should return false for supported shape with extension functions on local term expression', () => {
        const ctx = new ActionContext({ [KeysInitQuery.extensionFunctions.name]: {
          'ex:f': true,
        }});
        expect(actor.isPossibleToMoveSourceAnnotationUpwards(
          AF.createFilter(AF.createNop(), AF.createTermExpression(DF.namedNode('ex:f'))),
          {
            type: 'disjunction',
            children: [
              { type: 'operation', operation: { operationType: 'wildcard' }},
              {
                type: 'operation',
                operation: { operationType: 'type', type: Algebra.Types.EXPRESSION, extensionFunctions: [ 'ex:f' ]},
              },
            ],
          },
          ctx,
        )).toBeTruthy();
      });

      it('should return false for supported shape with extension functions on expression', () => {
        const ctx = new ActionContext({ [KeysInitQuery.extensionFunctions.name]: {}});
        expect(actor.isPossibleToMoveSourceAnnotationUpwards(
          AF.createNamedExpression(DF.namedNode('ex:f'), []),
          { type: 'operation', operation: { operationType: 'wildcard' }},
          ctx,
        )).toBeFalsy();
      });
    });
  });
});
