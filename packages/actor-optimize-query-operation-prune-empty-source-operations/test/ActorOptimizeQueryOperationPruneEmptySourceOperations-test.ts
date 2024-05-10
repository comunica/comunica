import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Factory } from 'sparqlalgebrajs';
import {
  ActorOptimizeQueryOperationPruneEmptySourceOperations,
} from '../lib/ActorOptimizeQueryOperationPruneEmptySourceOperations';

const AF = new Factory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationPruneEmptySourceOperations', () => {
  let bus: any;

  const ctx = new ActionContext();
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
                type: Algebra.types.NOP,
              },
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.PATTERN,
              },
            },
            {
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.types.LINK,
              },
            },
          ],
        }),
        queryBindings: jest.fn((op) => {
          const bindingsStream = new ArrayIterator([], { autoStart: false });
          let card = 0;
          switch (op.type) {
            case Algebra.types.NOP:
              card = 10;
              break;
            case Algebra.types.PATTERN:
              card = op.predicate.value === 'empty' ? 0 : 10;
              break;
            case Algebra.types.LINK:
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
          type: 'operation',
          operation: {
            operationType: 'type',
            type: Algebra.types.ASK,
          },
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
          operation: ActorQueryOperation.assignOperationSource(AF.createNop(), <any>{}),
        })).rejects.toThrow(`Actor actor does not work with top-level operation sources.`);
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
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune non-patterns', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF.createNop(), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune patterns without source', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            AF.createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            AF.createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should not prune for no empty children', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
          ]));
        });

        it('should prune all empty children', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should push up a single non-empty child', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
          );
        });

        it('should prune nested children', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            AF.createUnion([
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1.1'), DF.namedNode('o')), source1),
              AF.createUnion([
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.1.1'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            AF.createUnion([
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1.1'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
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
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune non-links', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createSeq([]), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createSeq([]), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune links without source', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            AF.createLink(DF.namedNode('empty')),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            AF.createLink(DF.namedNode('empty')),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should not prune for no empty children', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
          ]));
        });

        it('should prune all empty children', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([]));
        });

        it('should push up a single non-empty child', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
          );
        });

        it('should prune nested children', async() => {
          const opIn = AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            AF.createAlt([
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1.1')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              AF.createAlt([
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1.1.1')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            AF.createAlt([
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1.1')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1.1.1')), source1),
            ]),
          ]));
        });
      });

      describe('with mixed operations', () => {
        it('should prune alt in union', async() => {
          const opIn = AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
            AF.createAlt([
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
            ActorQueryOperation.assignOperationSource(AF
              .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
            AF.createAlt([
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
            ]),
          ]));
        });

        it('should prune union in join in union', async() => {
          const opIn = AF.createUnion([
            AF.createNop(),
            AF.createJoin([
              AF.createUnion([
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
              AF.createUnion([
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.2'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2.2'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ]),
            ]),
          ]);
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([
            AF.createNop(),
            AF.createJoin([
              AF.createUnion([
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              ]),
              AF.createUnion([
                ActorQueryOperation.assignOperationSource(AF
                  .createPattern(DF.namedNode('s'), DF.namedNode('p1.2'), DF.namedNode('o')), source1),
                ActorQueryOperation.assignOperationSource(AF
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
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              AF.createAlt([
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ]),
            ]),
            DF.namedNode('source'),
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createService(
            AF.createUnion([
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.namedNode('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.namedNode('o')), source1),
              AF.createAlt([
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p1')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('p2')), source1),
                ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
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
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
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
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
              ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('empty')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createUnion([]));
        });

        it('should not prune if the projection has no missing variables', async() => {
          const opIn = AF.createProject(
            AF.createUnion([
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('empty'), DF.variable('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
            ]),
            [
              DF.variable('o'),
            ],
          );
          const { operation: opOut } = await actor.run({ operation: opIn, context: ctx });
          expect(opOut).toEqual(AF.createProject(
            AF.createUnion([
              ActorQueryOperation.assignOperationSource(AF
                .createPattern(DF.namedNode('s'), DF.namedNode('nonEmpty'), DF.variable('o')), source1),
              ActorQueryOperation.assignOperationSource(AF
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
          await expect(actor.hasSourceResults(source1, AF.createNop(), ctx)).resolves.toBeTruthy();
        });

        it('should be false for cardinality === 0', async() => {
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { value: 0 }});
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(source1, AF.createNop(), ctx)).resolves.toBeFalsy();
        });

        it('should reject for an erroring query', async() => {
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.emit('error', new Error(`queryBindings error in ActorOptimizeQueryOperationPruneEmptySourceOperations`));
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(source1, AF.createNop(), ctx)).rejects
            .toThrow(`queryBindings error in ActorOptimizeQueryOperationPruneEmptySourceOperations`);
        });

        it('should not wrap the operation', async() => {
          await actor.hasSourceResults(source1, AF.createNop(), ctx);
          expect(source1.source.queryBindings).toHaveBeenCalledWith(AF.createNop(), ctx);
        });

        it('should be true for cardinality = 0 on a traversal source', async() => {
          source1.context = new ActionContext().set(KeysQuerySourceIdentify.traverse, true);
          source1.source.queryBindings = () => {
            const bindingsStream = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
            bindingsStream.setProperty('metadata', { cardinality: { value: 0 }});
            return bindingsStream;
          };
          await expect(actor.hasSourceResults(source1, AF.createNop(), ctx)).resolves.toBeTruthy();
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
          await expect(actor.hasSourceResults(sourceAsk, AF.createNop(), ctx)).resolves.toBeTruthy();
        });

        it('should be false for a source supporting ask and returning false', async() => {
          sourceAsk.source.queryBoolean = async() => false;
          await expect(actor.hasSourceResults(sourceAsk, AF.createNop(), ctx)).resolves.toBeFalsy();
        });

        it('should wrap the operation in an ask operation', async() => {
          jest.spyOn(sourceAsk.source, 'queryBoolean').mockImplementation(async() => true);
          await actor.hasSourceResults(sourceAsk, AF.createNop(), ctx);
          expect(sourceAsk.source.queryBoolean).toHaveBeenCalledWith(AF.createAsk(AF.createNop()), ctx);
        });

        it('should fallback to queryBindings if the source does not accept ask', async() => {
          await expect(actor.hasSourceResults(source1, AF.createNop(), ctx)).resolves.toBeTruthy();
          expect(source1.source.queryBindings).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
