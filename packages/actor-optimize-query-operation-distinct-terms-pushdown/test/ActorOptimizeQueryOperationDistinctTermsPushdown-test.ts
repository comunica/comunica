import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationDistinctTermsPushdown } from '../lib';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ActorOptimizeQueryOperationDistinctTermsPushdown', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationDistinctTermsPushdown instance', () => {
    let actor: ActorOptimizeQueryOperationDistinctTermsPushdown;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationDistinctTermsPushdown({ name: 'actor', bus });
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    });

    it('should test', async() => {
      await expect(actor.test({ operation: <any> undefined, context })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('should not optimize a non-distinct operation', async() => {
        const operation = AF.createProject(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          [ DF.variable('s') ],
        );
        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
      });

      it('should not optimize a distinct without project', async() => {
        const operation = AF.createDistinct(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
        );
        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
      });

      it('should not optimize a distinct-project without pattern', async() => {
        const operation = AF.createDistinct(
          AF.createProject(
            AF.createJoin([
              AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
              AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.variable('o2')),
            ]),
            [ DF.variable('s') ],
          ),
        );
        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
      });

      it('should not optimize when pattern has no source', async() => {
        const operation = AF.createDistinct(
          AF.createProject(
            AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            [ DF.variable('s') ],
          ),
        );
        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
      });

      it('should not optimize when source does not support DistinctTerms', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: Algebra.Types.PATTERN,
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );
        const operation = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('s') ]),
        );

        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
        expect(source.source.getSelectorShape).toHaveBeenCalledWith(expect.anything());
      });

      it('should not optimize when projected variable cannot be mapped to pattern term', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.namedNode('o')),
          source,
        );
        // Variable 'p' is not in the pattern (it's a named node)
        const operation = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('p') ]),
        );

        const { operation: operationOut } = await actor.run({ operation, context });
        expect(operationOut).toEqual(operation);
        // GetSelectorShape is called during source collection, but optimization fails at variable mapping
        expect(source.source.getSelectorShape).toHaveBeenCalledWith(expect.anything());
      });

      it('should optimize DISTINCT(PROJECT(PATTERN)) with supporting source', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );
        const operation = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('s'), DF.variable('p') ]),
        );

        const { operation: operationOut } = await actor.run({ operation, context });

        expect(operationOut).toMatchObject({
          type: 'distinctterms',
          variables: [ DF.variable('s'), DF.variable('p') ],
          terms: { s: 'subject', p: 'predicate' },
        });
        expect(source.source.getSelectorShape).toHaveBeenCalledWith(expect.anything());
      });

      it('should optimize and map all quad positions', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g')),
          source,
        );
        const operation = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g') ]),
        );

        const { operation: operationOut } = await actor.run({ operation, context });

        expect(operationOut).toMatchObject({
          type: 'distinctterms',
          variables: [ DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.variable('g') ],
          terms: { s: 'subject', p: 'predicate', o: 'object', g: 'graph' },
        });
      });

      it('should optimize with source context', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
          context: new ActionContext({ sourceKey: 'sourceValue' }),
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );
        const operation = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('s') ]),
        );

        const { operation: operationOut } = await actor.run({ operation, context });

        expect(operationOut.type).toBe('distinctterms');
        expect(source.source.getSelectorShape).toHaveBeenCalledWith(expect.anything());
      });

      it('should rewrite JOIN with single input before optimization', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );

        // DISTINCT(PROJECT(JOIN([PATTERN])))
        const operation = AF.createDistinct(
          AF.createProject(
            AF.createJoin([ pattern ]),
            [ DF.variable('s') ],
          ),
        );

        const { operation: operationOut } = await actor.run({ operation, context });

        // Should optimize because JOIN with single input is rewritten to just PATTERN
        expect(operationOut).toMatchObject({
          type: 'distinctterms',
          variables: [ DF.variable('s') ],
          terms: { s: 'subject' },
        });
        expect(source.source.getSelectorShape).toHaveBeenCalledWith(expect.anything());
      });

      it('should not optimize JOIN with multiple inputs', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern1 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );
        const pattern2 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.variable('o2')),
          source,
        );

        // DISTINCT(PROJECT(JOIN([PATTERN, PATTERN])))
        const operation = AF.createDistinct(
          AF.createProject(
            AF.createJoin([ pattern1, pattern2 ]),
            [ DF.variable('s') ],
          ),
        );

        const { operation: operationOut } = await actor.run({ operation, context });

        // Should not optimize because JOIN has multiple inputs
        expect(operationOut).toEqual(operation);
      });

      it('should preserve original operation when distinct is nested deeply', async() => {
        const source: IQuerySourceWrapper = <any> {
          source: {
            getSelectorShape: jest.fn(async() => ({
              type: 'operation',
              operation: {
                operationType: 'type',
                type: 'distinctterms',
              },
            })),
          },
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );

        const distinctOp = AF.createDistinct(
          AF.createProject(pattern, [ DF.variable('s') ]),
        );

        // Wrap it in another operation
        const operation = AF.createSlice(distinctOp, 0, 10);

        const { operation: operationOut } = await actor.run({ operation, context });

        // Should optimize the nested distinct
        expect(operationOut.type).toBe(Algebra.Types.SLICE);
        expect((<any>operationOut).input.type).toBe('distinctterms');
      });
    });

    describe('getSources', () => {
      it('should collect sources from a single pattern', () => {
        const source: IQuerySourceWrapper = <any> {
          source: {},
        };
        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );

        const sources = actor.getSources(pattern);
        expect(sources).toHaveLength(1);
        expect(sources[0]).toBe(source);
      });

      it('should collect sources from multiple patterns', () => {
        const source1: IQuerySourceWrapper = <any> {
          source: { id: 1 },
        };
        const source2: IQuerySourceWrapper = <any> {
          source: { id: 2 },
        };

        const pattern1 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source1,
        );
        const pattern2 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.variable('o2')),
          source2,
        );

        const operation = AF.createJoin([ pattern1, pattern2 ]);

        const sources = actor.getSources(operation);
        expect(sources).toHaveLength(2);
        expect(sources).toContainEqual(source1);
        expect(sources).toContainEqual(source2);
      });

      it('should deduplicate sources', () => {
        const source: IQuerySourceWrapper = <any> {
          source: {},
        };

        const pattern1 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );
        const pattern2 = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p2'), DF.variable('o2')),
          source,
        );

        const operation = AF.createJoin([ pattern1, pattern2 ]);

        const sources = actor.getSources(operation);
        expect(sources).toHaveLength(1);
        expect(sources[0]).toBe(source);
      });

      it('should return empty array when no sources are present', () => {
        const operation = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));

        const sources = actor.getSources(operation);
        expect(sources).toHaveLength(0);
      });

      it('should collect sources from nested operations', () => {
        const source: IQuerySourceWrapper = <any> {
          source: {},
        };

        const pattern = assignOperationSource(
          AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          source,
        );

        const operation = AF.createProject(
          AF.createDistinct(
            AF.createFilter(
              pattern,
              AF.createTermExpression(DF.variable('s')),
            ),
          ),
          [ DF.variable('s') ],
        );

        const sources = actor.getSources(operation);
        expect(sources).toHaveLength(1);
        expect(sources[0]).toBe(source);
      });
    });
  });
});
