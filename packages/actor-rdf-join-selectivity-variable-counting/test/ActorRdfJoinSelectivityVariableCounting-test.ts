import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorRdfJoinSelectivityVariableCounting, JoinTypes } from '../lib/ActorRdfJoinSelectivityVariableCounting';

const F = new Factory();
const DF = new DataFactory();

describe('ActorRdfJoinSelectivityVariableCounting', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfJoinSelectivityVariableCounting instance', () => {
    let actor: ActorRdfJoinSelectivityVariableCounting;

    beforeEach(() => {
      actor = new ActorRdfJoinSelectivityVariableCounting({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should return 0.5', async() => {
        expect(await actor.test(<any> {})).toEqual({ accuracy: 0.5 });
      });
    });

    describe('getPatternCost', () => {
      it('should handle a pattern without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getPatternCost(F.createPattern(
          DF.namedNode('ex:s'),
          DF.namedNode('ex:p'),
          DF.namedNode('ex:o'),
          DF.namedNode('ex:g'),
        ))).toEqual(1 / 9);
      });

      it('should handle a pattern with all variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getPatternCost(F.createPattern(
          DF.variable('ex:s'),
          DF.variable('ex:p'),
          DF.variable('ex:o'),
          DF.variable('ex:g'),
        ))).toEqual(1);
      });

      it('should handle a pattern with some variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getPatternCost(F.createPattern(
          DF.variable('ex:s'),
          DF.namedNode('ex:p'),
          DF.variable('ex:o'),
          DF.namedNode('ex:g'),
        ))).toEqual(7 / 9);
      });

      it('should handle a path with some variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getPatternCost(F.createPath(
          DF.variable('ex:s'),
          <any> {},
          DF.variable('ex:o'),
          DF.namedNode('ex:g'),
        ))).toEqual(8 / 9);
      });
    });

    describe('getJoinTypes', () => {
      it('should handle equal patterns without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
        )).toEqual([
          JoinTypes.boundSS,
          JoinTypes.boundPP,
          JoinTypes.boundOO,
          JoinTypes.boundGG,
        ]);
      });

      it('should handle equal patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
        )).toEqual([
          JoinTypes.unboundSS,
          JoinTypes.unboundPP,
          JoinTypes.unboundOO,
          JoinTypes.unboundGG,
        ]);
      });

      it('should handle patterns with every component equal without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
        )).toEqual([
          JoinTypes.boundSS,
          JoinTypes.boundSP,
          JoinTypes.boundSO,
          JoinTypes.boundSG,
          JoinTypes.boundPS,
          JoinTypes.boundPP,
          JoinTypes.boundPO,
          JoinTypes.boundPG,
          JoinTypes.boundOS,
          JoinTypes.boundOP,
          JoinTypes.boundOO,
          JoinTypes.boundOG,
          JoinTypes.boundGS,
          JoinTypes.boundGP,
          JoinTypes.boundGO,
          JoinTypes.boundGG,
        ]);
      });

      it('should handle patterns with every component equal with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
        )).toEqual([
          JoinTypes.unboundSS,
          JoinTypes.unboundSP,
          JoinTypes.unboundSO,
          JoinTypes.unboundSG,
          JoinTypes.unboundPS,
          JoinTypes.unboundPP,
          JoinTypes.unboundPO,
          JoinTypes.unboundPG,
          JoinTypes.unboundOS,
          JoinTypes.unboundOP,
          JoinTypes.unboundOO,
          JoinTypes.unboundOG,
          JoinTypes.unboundGS,
          JoinTypes.unboundGP,
          JoinTypes.unboundGO,
          JoinTypes.unboundGG,
        ]);
      });

      it('should handle patterns with some components equal with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p1'),
            DF.variable('ex:s'),
            DF.variable('ex:g1'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p2'),
            DF.variable('ex:s'),
            DF.variable('ex:g2'),
          ),
        )).toEqual([
          JoinTypes.unboundSS,
          JoinTypes.unboundSO,
          JoinTypes.unboundOS,
          JoinTypes.unboundOO,
        ]);
      });

      it('should handle equal components in path and pattern without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPath(
            DF.namedNode('ex:s'),
            <any> {},
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
        )).toEqual([
          JoinTypes.boundSS,
          JoinTypes.boundSP,
          JoinTypes.boundSO,
          JoinTypes.boundSG,
          JoinTypes.boundOS,
          JoinTypes.boundOP,
          JoinTypes.boundOO,
          JoinTypes.boundOG,
          JoinTypes.boundGS,
          JoinTypes.boundGP,
          JoinTypes.boundGO,
          JoinTypes.boundGG,
        ]);
      });

      it('should handle equal components in pattern and path without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
          F.createPath(
            DF.namedNode('ex:s'),
            <any> {},
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
        )).toEqual([
          JoinTypes.boundSS,
          JoinTypes.boundSO,
          JoinTypes.boundSG,
          JoinTypes.boundPS,
          JoinTypes.boundPO,
          JoinTypes.boundPG,
          JoinTypes.boundOS,
          JoinTypes.boundOO,
          JoinTypes.boundOG,
          JoinTypes.boundGS,
          JoinTypes.boundGO,
          JoinTypes.boundGG,
        ]);
      });

      it('should handle equal components in path and pattern with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPath(
            DF.variable('ex:s'),
            <any> {},
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
        )).toEqual([
          JoinTypes.unboundSS,
          JoinTypes.unboundSP,
          JoinTypes.unboundSO,
          JoinTypes.unboundSG,
          JoinTypes.unboundOS,
          JoinTypes.unboundOP,
          JoinTypes.unboundOO,
          JoinTypes.unboundOG,
          JoinTypes.unboundGS,
          JoinTypes.unboundGP,
          JoinTypes.unboundGO,
          JoinTypes.unboundGG,
        ]);
      });

      it('should handle equal components in pattern and path with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getJoinTypes(
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
          F.createPath(
            DF.variable('ex:s'),
            <any> {},
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
        )).toEqual([
          JoinTypes.unboundSS,
          JoinTypes.unboundSO,
          JoinTypes.unboundSG,
          JoinTypes.unboundPS,
          JoinTypes.unboundPO,
          JoinTypes.unboundPG,
          JoinTypes.unboundOS,
          JoinTypes.unboundOO,
          JoinTypes.unboundOG,
          JoinTypes.unboundGS,
          JoinTypes.unboundGO,
          JoinTypes.unboundGG,
        ]);
      });
    });

    describe('getOperationsPairwiseJoinCost', () => {
      it('should handle equal patterns without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
        )).toEqual(1);
      });

      it('should handle equal patterns without variables with different predicates', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
        )).toEqual(1 - 12 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle equal patterns with variables with different predicates', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.variable('ex:s'),
            DF.namedNode('ex:p1'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.namedNode('ex:p2'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
        )).toEqual(1 - 6 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle unequal patterns without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g1'),
          ),
          F.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:o2'),
            DF.namedNode('ex:g2'),
          ),
        )).toEqual(1);
      });

      it('should handle unequal patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g1'),
          ),
          F.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:o2'),
            DF.namedNode('ex:g2'),
          ),
        )).toEqual(1);
      });

      it('should handle overlapping patterns without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g1'),
          ),
          F.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g2'),
          ),
        )).toEqual(1 - 6 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle overlapping patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.variable('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.variable('ex:o1'),
            DF.namedNode('ex:g1'),
          ),
          F.createPattern(
            DF.variable('ex:s1'),
            DF.namedNode('ex:p2'),
            DF.variable('ex:o1'),
            DF.namedNode('ex:g2'),
          ),
        )).toEqual(1 - 3 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle maximally equal patterns without variables with different predicates', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
        )).toEqual(1 - 40 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle maximally equal patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
        )).toEqual(1 - 41 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle mixed patterns', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.variable('s'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.variable('s'),
            DF.namedNode('ex:p2'),
            DF.variable('o'),
            DF.namedNode('ex:g'),
          ),
        )).toEqual(1 - 8 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle only predicates matching with all components', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(
          F.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:s1'),
          ),
          F.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:s2'),
          ),
        )).toEqual(1 - 36 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });
    });

    describe('getOperationsJoinCost', () => {
      it('should handle equal patterns without variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p'),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
        ])).toEqual(1 / 9 / 9);
      });

      it('should handle equal patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:p'),
            DF.variable('ex:o'),
            DF.variable('ex:g'),
          ),
        ])).toEqual(1 - 9 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle maximally equal patterns without variables with different predicates', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
          F.createPattern(
            DF.namedNode('ex:s'),
            DF.namedNode('ex:p2'),
            DF.namedNode('ex:s'),
            DF.namedNode('ex:s'),
          ),
        ])).toEqual((1 - 40 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST) * (1 / 9) * (1 / 9));
      });

      it('should handle maximally equal patterns with variables', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
          F.createPattern(
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
            DF.variable('ex:s'),
          ),
        ])).toEqual(1 - 41 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST);
      });

      it('should handle mixed patterns', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createPattern(
            DF.variable('s'),
            DF.namedNode('ex:p1'),
            DF.namedNode('ex:o1'),
            DF.namedNode('ex:g'),
          ),
          F.createPattern(
            DF.variable('s'),
            DF.namedNode('ex:p2'),
            DF.variable('o'),
            DF.namedNode('ex:g'),
          ),
        ])).toEqual((1 - 8 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST) * (5 / 9) * (7 / 9));
      });

      it('should handle patterns and paths in BGPs', async() => {
        expect(ActorRdfJoinSelectivityVariableCounting.getOperationsJoinCost([
          F.createBgp([
            F.createPattern(
              DF.namedNode('ex:s'),
              DF.namedNode('ex:p'),
              DF.namedNode('ex:o'),
              DF.namedNode('ex:g'),
            ),
          ]),
          F.createPath(
            DF.namedNode('ex:s'),
            F.createNps([ DF.namedNode('ex:p') ]),
            DF.namedNode('ex:o'),
            DF.namedNode('ex:g'),
          ),
        ])).toEqual((1 - 12 / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST) * (1 / 9) * (2 / 9));
      });
    });

    describe('run', () => {
      it('should handle zero entries', async() => {
        expect(await actor.run({
          entries: [],
          context,
        })).toEqual({ selectivity: 1 });
      });

      it('should handle one entry', async() => {
        expect(await actor.run({
          entries: [
            {
              output: <any> {},
              operation: F.createPattern(
                DF.namedNode('ex:s'),
                DF.namedNode('ex:p'),
                DF.namedNode('ex:o'),
                DF.namedNode('ex:g'),
              ),
            },
          ],
          context,
        })).toEqual({ selectivity: 1 });
      });

      it('should produce sensible rounded selectivities', async() => {
        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o'), DF.namedNode('ex:g')),
        )).toEqual(`0.390`);

        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g')),
        )).toEqual(`0.279`);

        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s2'), DF.namedNode('ex:p3'), DF.variable('o'), DF.namedNode('ex:g')),
        )).toEqual(`0.307`);

        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s2'), DF.namedNode('ex:p3'), DF.variable('o'), DF.namedNode('ex:g2')),
        )).toEqual(`0.324`);

        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.variable('o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o2'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p3'), DF.variable('o3'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p4'), DF.variable('o4'), DF.namedNode('ex:g')),
        )).toEqual(`0.330`);

        expect(await runCompact(
          F.createPattern(DF.variable('s1'), DF.namedNode('ex:p1'), DF.variable('o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s1'), DF.namedNode('ex:p2'), DF.variable('o2'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s2'), DF.namedNode('ex:p3'), DF.variable('o3'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s2'), DF.namedNode('ex:p4'), DF.variable('o4'), DF.namedNode('ex:g')),
        )).toEqual(`0.336`);

        expect(await runCompact(
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o2'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3'), DF.namedNode('ex:g')),
          F.createPattern(DF.variable('s'), DF.namedNode('ex:p4'), DF.variable('o4'), DF.namedNode('ex:g')),
        )).toEqual(`0.168`);
      });
    });

    async function runCompact(...operations: Algebra.Operation[]): Promise<string> {
      const { selectivity } = await actor.run({
        entries: operations.map(operation => ({
          output: <any> {},
          operation,
        })),
        context,
      });
      return selectivity.toFixed(3);
    }
  });
});
