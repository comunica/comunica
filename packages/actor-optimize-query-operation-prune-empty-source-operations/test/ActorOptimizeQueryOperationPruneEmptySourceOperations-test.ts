import { KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import {
  ActorOptimizeQueryOperationPruneEmptySourceOperations,
} from '../lib/ActorOptimizeQueryOperationPruneEmptySourceOperations';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationPruneEmptySourceOperations', () => {
  let bus: any;

  const ctx = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  let source1: IQuerySourceWrapper;
  let sourceAsk: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    source1 = <any> {
      source: {
        referenceValue: 'source1',
        getSelectorShape: () => ({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.NOP,
              },
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.PATTERN,
              },
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.LINK,
              },
            },
          ],
        }),
        queryBindings: jest.fn((op) => {
          const bindingsStream = new ArrayIterator([], { autoStart: false });
          let card = 0;
          switch (op.type) {
            case Algebra.Types.NOP:
              card = 10;
              break;
            case Algebra.Types.PATTERN:
              card = op.predicate.value === 'empty' ? 0 : 10;
              break;
            case Algebra.Types.LINK:
              card = op.value === 'empty' ? 0 : 10;
              break;
          }
          bindingsStream.setProperty('metadata', { cardinality: { value: card }});
          return bindingsStream;
        }),
      },
    };
    sourceAsk = <any> {
      source: {
        referenceValue: 'source1',
        getSelectorShape: () => ({
          type: 'disjunction',
          children: [
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.ASK,
              },
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.NOP,
              },
            },
          ],
        }),
        async queryBoolean() {
          return true;
        },
      },
    };
  });

  describe('An ActorOptimizeQueryOperationPruneEmptySourceOperations instance', () => {
    let actor: ActorOptimizeQueryOperationPruneEmptySourceOperations;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationPruneEmptySourceOperations({
        name: 'actor',
        bus,
        useAskIfSupported: false,
      });
    });

    describe('test', () => {
      it('should handle operations without top-level source', async() => {
        await expect(actor.test({ context: new ActionContext(), operation: AF.createNop() })).resolves.toBeTruthy();
      });

      it('should not handle operations with top-level source', async() => {
        await expect(actor.test({
          context: new ActionContext(),
          operation: assignOperationSource(AF.createNop(), <any>{}),
        })).resolves.toFailTest(`Actor actor does not work with top-level operation sources.`);
      });
    });

    describe('run', () => {
      it('should not modify a nop', async() => {
        const opIn = AF.createNop();
        const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
        expect(opOut).toBe(opIn);
      });

      describe('with unions', () => {
        it('should not modify 0 children', async() => {
          const opIn = AF.createUnion([]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toBe(opIn);
        });

        it('should prune empty children', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune non-patterns', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF.createNop(), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF.createNop(), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune patterns without source', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            AF.createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            AF.createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune for no empty children', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should prune all empty children', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should push up a single non-empty child', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
          );
        });

        it('should prune nested children', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1.1'), DF.namedNode('o')), source1),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.1.1'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1.1'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1.1.1'), DF.namedNode('o')), source1),
            ]),
          ]));
        });
      });

      describe('with alts', () => {
        it('should not modify 0 children', async() => {
          const opIn = AF.createAlt([]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toBe(opIn);
        });

        it('should prune empty children', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune non-links', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createSeq([]), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createSeq([]), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune links without source', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            AF.createLink(DF.namedNode('empty')),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            AF.createLink(DF.namedNode('empty')),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune for no empty children', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should prune all empty children', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([]));
        });

        it('should push up a single non-empty child', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
          );
        });

        it('should prune nested children', async() => {
          const opIn = AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('p1.1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              AF.createAlt([
                assignOperationSource(AF.createLink(DF.namedNode('p1.1.1')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('p1.1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p1.1.1')), source1),
            ]),
          ]));
        });
      });

      describe('with mixed operations', () => {
        it('should prune alt in union', async() => {
          const opIn = AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ]),
          ]));
        });

        it('should prune union in join in union', async() => {
          const opIn = AF.createUnion([
            AF.createNop(),
            AF.createJoin([
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.2'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2.2'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            AF.createNop(),
            AF.createJoin([
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              ]),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.2'), DF.namedNode('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2.2'), DF.namedNode('o')), source1),
              ]),
            ]),
          ]));
        });
      });

      describe('with service operations', () => {
        it('should not modify children', async() => {
          const opIn = AF.createService(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              AF.createAlt([
                assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
            ]),
            DF.namedNode('source'),
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createService(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              AF.createAlt([
                assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
            ]),
            DF.namedNode('source'),
          ));
        });
      });

      describe('with projections', () => {
        it('should prune if the projection now has missing variables in union', async() => {
          const opIn = AF.createProject(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should prune if the projection now has missing variables in alt', async() => {
          const opIn = AF.createProject(
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should not prune if the projection does not have missing variables in alt', async() => {
          const opIn = AF.createProject(
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('nonempty')), source1),
              AF.createAlt([
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
                assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
              assignOperationSource(AF.createLink(DF.namedNode('nonempty')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('nonempty')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('nonempty')), source1),
          ]), [ DF.variable('o') ]));
        });

        it('should not prune if the projection now has partial missing variables in alt', async() => {
          const opIn = AF.createProject(
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createAlt([
              assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          ));
        });

        it('should not prune if the projection has no missing variables', async() => {
          const opIn = AF.createProject(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          ));
        });

        it('should not prune if the projection had other valid operations', async() => {
          const opIn = AF.createProject(
            AF.createUnion([
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                ]),
              ]),
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                ]),
              ]),
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                ]),
              ]),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createUnion([
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                ]),
              ]),
              AF.createJoin([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
              AF.createJoin([
                AF.createUnion([]),
              ]),
            ]),
            [
              DF.variable('o'),
            ],
          ));
        });

        it('should prune if the projection contains mixed unions and joins', async() => {
          const opIn = AF.createProject(
            AF.createUnion([
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                ]),
              ]),
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                ]),
              ]),
              AF.createJoin([
                AF.createUnion([
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                  assignOperationSource(AF
                    .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                ]),
              ]),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should prune out left joins with empty left operation', async() => {
          const opIn = AF.createProject(
            AF.createLeftJoin(
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              ]),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
            ),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should not prune out left joins with non-empty left operation', async() => {
          const opIn = AF.createProject(
            AF.createLeftJoin(
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
            ),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createLeftJoin(
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
            ),
            [
              DF.variable('o'),
            ],
          ));
        });

        it('should remove left joins operator with empty right operation', async() => {
          const opIn = AF.createProject(
            AF.createLeftJoin(
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ]),
              AF.createUnion([
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
                assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              ]),
            ),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createUnion([
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          ));
        });
      });
    });

    describe('hasSourceResults', () => {
      describe('for ask false', () => {
        it('should be true for cardinality > 0', async() => {
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), ctx)).resolves.toBeTruthy();
        });

        it('should be false for cardinality === 0', async() => {
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { type: 'exact', value: 0 }});
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), ctx)).resolves.toBeFalsy();
        });

        it('should verify cardinality estimates via ASK', async() => {
          sourceAsk.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { type: 'estimate', value: 1 }});
            return bindingsStream;
          };
          jest.spyOn(sourceAsk.source, 'queryBoolean').mockResolvedValueOnce(false);
          expect(sourceAsk.source.queryBoolean).not.toHaveBeenCalled();
          await expect(actor.hasSourceResults(AF, sourceAsk, AF.createNop(), ctx)).resolves.toBeFalsy();
          expect(sourceAsk.source.queryBoolean).toHaveBeenCalledTimes(1);
        });

        it('should not verify cardinality estimates via ASK if source does not support it', async() => {
          sourceAsk.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { type: 'estimate', value: 1 }});
            return bindingsStream;
          };
          sourceAsk.source.getSelectorShape = async() => ({
            type: 'operation',
            operation: {
              operationType: 'pattern',
              pattern: AF.createPattern(
                DF.variable('s'),
                DF.variable('p'),
                DF.variable('o'),
                DF.variable('g'),
              ),
            },
          });
          jest.spyOn(sourceAsk.source, 'queryBoolean').mockResolvedValueOnce(false);
          expect(sourceAsk.source.queryBoolean).not.toHaveBeenCalled();
          await expect(actor.hasSourceResults(AF, sourceAsk, AF.createNop(), ctx)).resolves.toBeTruthy();
          expect(sourceAsk.source.queryBoolean).not.toHaveBeenCalled();
        });

        it('should reject for an erroring query', async() => {
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.emit('error', new Error(`queryBindings error in ActorOptimizeQueryOperationPruneEmptySourceOperations`));
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), ctx)).rejects
            .toThrow(`queryBindings error in ActorOptimizeQueryOperationPruneEmptySourceOperations`);
        });

        it('should not wrap the operation', async() => {
          await actor.hasSourceResults(AF, source1, AF.createNop(), ctx);
          expect(source1.source.queryBindings).toHaveBeenCalledWith(AF.createNop(), ctx);
        });

        it('should merge action and source contexts', async() => {
          const sourceContext = new ActionContext({ 'urn:sckey': true });
          const actionContext = new ActionContext({ 'urn:ackey': false });
          const mergedContext = sourceContext.merge(actionContext);
          const op = AF.createNop();
          await actor.hasSourceResults(AF, { ...source1, context: sourceContext }, op, actionContext);
          expect(source1.source.queryBindings).toHaveBeenCalledWith(op, mergedContext);
        });

        it('should be true for 0 cardinality on source with traversal enabled', async() => {
          source1.context = new ActionContext().set(KeysQuerySourceIdentify.traverse, true);
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { type: 'exact', value: 0 }});
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), ctx)).resolves.toBeTruthy();
        });

        it('should be true for 0 cardinality on source with traversal enabled via action context', async() => {
          const actionContext = new ActionContext({ [KeysQuerySourceIdentify.traverse.name]: true });
          source1.context = new ActionContext();
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { type: 'exact', value: 0 }});
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), actionContext)).resolves.toBeTruthy();
        });
      });

      describe('for ask true', () => {
        beforeEach(() => {
          actor = new ActorOptimizeQueryOperationPruneEmptySourceOperations({
            name: 'actor',
            bus,
            useAskIfSupported: true,
          });
        });

        it('should be true for a source supporting ask and returning true', async() => {
          await expect(actor.hasSourceResults(AF, sourceAsk, AF.createNop(), ctx)).resolves.toBeTruthy();
        });

        it('should be false for a source supporting ask and returning false', async() => {
          sourceAsk.source.queryBoolean = async() => false;
          await expect(actor.hasSourceResults(AF, sourceAsk, AF.createNop(), ctx)).resolves.toBeFalsy();
        });

        it('should wrap the operation in an ask operation', async() => {
          jest.spyOn(sourceAsk.source, 'queryBoolean').mockImplementation(async() => true);
          await actor.hasSourceResults(AF, sourceAsk, AF.createNop(), ctx);
          expect(sourceAsk.source.queryBoolean).toHaveBeenCalledWith(AF.createAsk(AF.createNop()), ctx);
        });

        it('should fallback to queryBindings if the source does not accept ask', async() => {
          await expect(actor.hasSourceResults(AF, source1, AF.createNop(), ctx)).resolves.toBeTruthy();
          expect(source1.source.queryBindings).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
