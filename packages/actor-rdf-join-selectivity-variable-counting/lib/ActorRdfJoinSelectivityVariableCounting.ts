import type { IActionRdfJoinSelectivity, IActorRdfJoinSelectivityOutput } from '@comunica/bus-rdf-join-selectivity';
import { ActorRdfJoinSelectivity } from '@comunica/bus-rdf-join-selectivity';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeAccuracy } from '@comunica/mediatortype-accuracy';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * A comunica Variable Counting RDF Join Selectivity Actor.
 * Based on the "variable counting predicates" heuristic from
 * "SPARQL basic graph pattern optimization using selectivity estimation."
 */
export class ActorRdfJoinSelectivityVariableCounting extends ActorRdfJoinSelectivity {
  // Calculated as sum of unbound join type costs times 2 (best-case)
  public static MAX_PAIRWISE_COST = 41 * 2;

  public constructor(
    args: IActorArgs<IActionRdfJoinSelectivity, IMediatorTypeAccuracy, IActorRdfJoinSelectivityOutput>,
  ) {
    super(args);
  }

  public async test(action: IActionRdfJoinSelectivity): Promise<IMediatorTypeAccuracy> {
    return { accuracy: 0.5 };
  }

  public static getPatternCost(pattern: Algebra.Pattern | Algebra.Path): number {
    let cost = 1;
    if (pattern.subject.termType === 'Variable') {
      cost += 4;
    }
    if (pattern.predicate.termType === 'Variable' || pattern.type === Algebra.types.PATH) {
      cost += 1;
    }
    if (pattern.object.termType === 'Variable') {
      cost += 2;
    }
    if (pattern.graph.termType === 'Variable') {
      cost += 1;
    }
    return cost / 9;
  }

  public static getJoinTypes(
    operation1: Algebra.Pattern | Algebra.Path,
    operation2: Algebra.Pattern | Algebra.Path,
  ): JoinTypes[] {
    const joinTypes: JoinTypes[] = [];

    // Check operation1.subject
    if (operation1.subject.termType === 'Variable') {
      if (operation1.subject.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.unboundSS);
      }
      if (operation2.type === 'pattern' && operation1.subject.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.unboundSP);
      }
      if (operation1.subject.equals(operation2.object)) {
        joinTypes.push(JoinTypes.unboundSO);
      }
      if (operation1.subject.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.unboundSG);
      }
    } else {
      if (operation1.subject.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.boundSS);
      }
      if (operation2.type === 'pattern' && operation1.subject.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.boundSP);
      }
      if (operation1.subject.equals(operation2.object)) {
        joinTypes.push(JoinTypes.boundSO);
      }
      if (operation1.subject.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.boundSG);
      }
    }

    // Check operation1.predicate
    if (operation1.type === 'pattern') {
      if (operation1.predicate.termType === 'Variable') {
        if (operation1.predicate.equals(operation2.subject)) {
          joinTypes.push(JoinTypes.unboundPS);
        }
        if (operation2.type === 'pattern' && operation1.predicate.equals(operation2.predicate)) {
          joinTypes.push(JoinTypes.unboundPP);
        }
        if (operation1.predicate.equals(operation2.object)) {
          joinTypes.push(JoinTypes.unboundPO);
        }
        if (operation1.predicate.equals(operation2.graph)) {
          joinTypes.push(JoinTypes.unboundPG);
        }
      } else {
        if (operation1.predicate.equals(operation2.subject)) {
          joinTypes.push(JoinTypes.boundPS);
        }
        if (operation2.type === 'pattern' && operation1.predicate.equals(operation2.predicate)) {
          joinTypes.push(JoinTypes.boundPP);
        }
        if (operation1.predicate.equals(operation2.object)) {
          joinTypes.push(JoinTypes.boundPO);
        }
        if (operation1.predicate.equals(operation2.graph)) {
          joinTypes.push(JoinTypes.boundPG);
        }
      }
    }

    // Check operation1.object
    if (operation1.object.termType === 'Variable') {
      if (operation1.object.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.unboundOS);
      }
      if (operation2.type === 'pattern' && operation1.object.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.unboundOP);
      }
      if (operation1.object.equals(operation2.object)) {
        joinTypes.push(JoinTypes.unboundOO);
      }
      if (operation1.object.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.unboundOG);
      }
    } else {
      if (operation1.object.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.boundOS);
      }
      if (operation2.type === 'pattern' && operation1.object.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.boundOP);
      }
      if (operation1.object.equals(operation2.object)) {
        joinTypes.push(JoinTypes.boundOO);
      }
      if (operation1.object.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.boundOG);
      }
    }

    // Check operation1.graph
    if (operation1.graph.termType === 'Variable') {
      if (operation1.graph.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.unboundGS);
      }
      if (operation2.type === 'pattern' && operation1.graph.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.unboundGP);
      }
      if (operation1.graph.equals(operation2.object)) {
        joinTypes.push(JoinTypes.unboundGO);
      }
      if (operation1.graph.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.unboundGG);
      }
    } else {
      if (operation1.graph.equals(operation2.subject)) {
        joinTypes.push(JoinTypes.boundGS);
      }
      if (operation2.type === 'pattern' && operation1.graph.equals(operation2.predicate)) {
        joinTypes.push(JoinTypes.boundGP);
      }
      if (operation1.graph.equals(operation2.object)) {
        joinTypes.push(JoinTypes.boundGO);
      }
      if (operation1.graph.equals(operation2.graph)) {
        joinTypes.push(JoinTypes.boundGG);
      }
    }

    return joinTypes;
  }

  public static getOperationsPairwiseJoinCost(
    operation1: Algebra.Pattern | Algebra.Path,
    operation2: Algebra.Pattern | Algebra.Path,
  ): number {
    let cost = ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST;

    for (const joinType of ActorRdfJoinSelectivityVariableCounting.getJoinTypes(operation1, operation2)) {
      switch (joinType) {
        case JoinTypes.boundSS:
          cost -= 2 * 2;
          break;
        case JoinTypes.boundSP:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundSO:
          cost -= 1 * 2;
          break;
        case JoinTypes.boundSG:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundPS:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundPP:
          // Special case: patterns with equal (bound) predicates have the highest cost
          return 1;
        case JoinTypes.boundPO:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundPG:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundOS:
          cost -= 1 * 2;
          break;
        case JoinTypes.boundOP:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundOO:
          cost -= 1 * 2;
          break;
        case JoinTypes.boundOG:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundGS:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundGP:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundGO:
          cost -= 3 * 2;
          break;
        case JoinTypes.boundGG:
          cost -= 3 * 2;
          break;
        case JoinTypes.unboundSS:
          cost -= 2;
          break;
        case JoinTypes.unboundSP:
          cost -= 3;
          break;
        case JoinTypes.unboundSO:
          cost -= 1;
          break;
        case JoinTypes.unboundSG:
          cost -= 3;
          break;
        case JoinTypes.unboundPS:
          cost -= 3;
          break;
        case JoinTypes.unboundPP:
          cost -= 3;
          break;
        case JoinTypes.unboundPO:
          cost -= 3;
          break;
        case JoinTypes.unboundPG:
          cost -= 3;
          break;
        case JoinTypes.unboundOS:
          cost -= 1;
          break;
        case JoinTypes.unboundOP:
          cost -= 3;
          break;
        case JoinTypes.unboundOO:
          cost -= 1;
          break;
        case JoinTypes.unboundOG:
          cost -= 3;
          break;
        case JoinTypes.unboundGS:
          cost -= 3;
          break;
        case JoinTypes.unboundGP:
          cost -= 3;
          break;
        case JoinTypes.unboundGO:
          cost -= 3;
          break;
        case JoinTypes.unboundGG:
          cost -= 3;
          break;
      }
    }

    return cost / ActorRdfJoinSelectivityVariableCounting.MAX_PAIRWISE_COST;
  }

  public static getOperationsJoinCost(operations: Algebra.Operation[]): number {
    // Determine all operations that select values (patterns and paths)
    const patterns: (Algebra.Pattern | Algebra.Path)[] = [];
    for (const operation of operations) {
      Util.recurseOperation(operation, {
        [Algebra.types.PATTERN](pattern: Algebra.Pattern): boolean {
          patterns.push(pattern);
          return false;
        },
        [Algebra.types.PATH](path: Algebra.Path): boolean {
          patterns.push(path);
          return false;
        },
      });
    }

    // Determine pairwise costs
    let totalCost = 0;
    let costEntries = 0;
    for (const pattern1 of patterns) {
      for (const pattern2 of patterns) {
        if (pattern1 !== pattern2) {
          totalCost += ActorRdfJoinSelectivityVariableCounting.getOperationsPairwiseJoinCost(pattern1, pattern2);
          costEntries++;
        }
      }
    }

    // Combine all pairwise costs, and multiply with costs of each pattern separately
    return totalCost / costEntries * patterns
      .reduce((factor, pattern) => factor * ActorRdfJoinSelectivityVariableCounting.getPatternCost(pattern), 1);
  }

  public async run(action: IActionRdfJoinSelectivity): Promise<IActorRdfJoinSelectivityOutput> {
    if (action.entries.length <= 1) {
      return { selectivity: 1 };
    }
    return {
      selectivity: ActorRdfJoinSelectivityVariableCounting
        .getOperationsJoinCost(action.entries.map(entry => entry.operation)),
    };
  }
}

export enum JoinTypes {
  boundSS,
  boundSP,
  boundSO,
  boundSG,
  boundPS,
  boundPP,
  boundPO,
  boundPG,
  boundOS,
  boundOP,
  boundOO,
  boundOG,
  boundGS,
  boundGP,
  boundGO,
  boundGG,

  unboundSS,
  unboundSP,
  unboundSO,
  unboundSG,
  unboundPS,
  unboundPP,
  unboundPO,
  unboundPG,
  unboundOS,
  unboundOP,
  unboundOO,
  unboundOG,
  unboundGS,
  unboundGP,
  unboundGO,
  unboundGG,
}
