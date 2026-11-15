import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, IJoinEntryWithMetadata, IQuerySourceWrapper } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinEntriesSortFreeVariables } from '../lib/ActorRdfJoinEntriesSortFreeVariables';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const A = ActorRdfJoinEntriesSortFreeVariables;

const sourceA = <IQuerySourceWrapper> <any> { source: 'a' };
const sourceB = <IQuerySourceWrapper> <any> { source: 'b' };

function v(name: string) {
  return DF.variable(name);
}

function n(iri: string) {
  return DF.namedNode(`ex:${iri}`);
}

function pattern(s: string, p: string, o: string): Algebra.Pattern {
  const term = (value: string) => value.startsWith('?') ? v(value.slice(1)) : n(value);
  return AF.createPattern(term(s), term(p), term(o), DF.defaultGraph());
}

function entry(
  operation: Algebra.Operation,
  operationModified?: boolean,
  cardinality = Number.POSITIVE_INFINITY,
): IJoinEntryWithMetadata {
  return <any> { operation, operationModified, metadata: { cardinality: { type: 'estimate', value: cardinality }}};
}

function overSources(operation: Algebra.Operation): Algebra.Union {
  return AF.createUnion([
    assignOperationSource(operation, sourceA),
    assignOperationSource(operation, sourceB),
  ], false);
}

describe('ActorRdfJoinEntriesSortFreeVariables', () => {
  let bus: any;
  let context: IActionContext;
  let actor: ActorRdfJoinEntriesSortFreeVariables;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
    actor = new ActorRdfJoinEntriesSortFreeVariables({ name: 'actor', bus });
  });

  describe('test', () => {
    const message = 'Actor actor can only sort entries of which operations are assigned to multiple sources';

    it('should fail without operations assigned to sources', async() => {
      await expect(actor.test({ entries: [ entry(pattern('?s', 'p', '?o')) ], context })).resolves
        .toFailTest(message);
    });

    it('should fail for operations assigned to a single source', async() => {
      const operation = AF.createUnion([
        assignOperationSource(pattern('?s', 'p', '?o'), sourceA),
        pattern('?s', 'p', '?o'),
      ]);
      const other = assignOperationSource(pattern('?s', 'q', '?o'), sourceA);
      await expect(actor.test({ entries: [ entry(operation), entry(other) ], context })).resolves
        .toFailTest(message);
    });

    it('should fail for empty unions', async() => {
      await expect(actor.test({ entries: [ entry(AF.createUnion([])) ], context })).resolves.toFailTest(message);
    });

    it('should fail if all cardinalities are known', async() => {
      const operation = overSources(pattern('?s', 'p', '?o'));
      await expect(actor.test({ entries: [ entry(operation, false, 3), entry(operation, false, 0) ], context }))
        .resolves.toFailTest('Actor actor can only sort entries of which a cardinality is unknown');
    });

    it('should pass if a cardinality is unknown', async() => {
      const operation = overSources(pattern('?s', 'p', '?o'));
      await expect(actor.test({ entries: [ entry(operation, false, 3), entry(operation) ], context }))
        .resolves.toPassTest({ accuracy: 1 });
    });

    it('should pass for operations assigned to different sources', async() => {
      const operationA = assignOperationSource(pattern('?s', 'p', '?o'), sourceA);
      const operationB = assignOperationSource(pattern('?s', 'q', '?o'), sourceB);
      await expect(actor.test({ entries: [ entry(operationA), entry(operationB) ], context })).resolves
        .toPassTest({ accuracy: 1 });
    });

    it('should pass for a union of operations assigned to sources', async() => {
      await expect(actor.test({ entries: [ entry(overSources(pattern('?s', 'p', '?o'))) ], context })).resolves
        .toPassTest({ accuracy: 1 });
    });
  });

  describe('run', () => {
    it('should start with the most selective entry and follow the bound variables', async() => {
      const actorSameAs = entry(overSources(pattern('?actor', 'sameAs', '?x')));
      const ySameAs = entry(overSources(pattern('?y', 'sameAs', '?x')));
      const film = entry(assignOperationSource(AF.createJoin([
        pattern('?film', 'title', 'Tarzan'),
        pattern('?film', 'actor', '?actor'),
      ]), sourceA));
      const news = entry(assignOperationSource(pattern('?y', 'topicPage', '?news'), sourceB));
      await expect(actor.run({ entries: [ actorSameAs, ySameAs, film, news ], context })).resolves
        .toEqual({ entries: [ film, actorSameAs, ySameAs, news ]});
    });

    it('should place entries with evaluated operations first and consider their variables bound', async() => {
      const evaluated = entry(AF.createJoin([ pattern('?a', 'p', '?b') ]), true);
      const unrelated = entry(assignOperationSource(pattern('?c', 'p', '?e'), sourceA));
      const related = entry(overSources(pattern('?b', '?q', '?d')));
      await expect(actor.run({ entries: [ unrelated, related, evaluated ], context })).resolves
        .toEqual({ entries: [ evaluated, related, unrelated ]});
    });

    it('should prefer stars over other groups with equally selective patterns', async() => {
      const chain = entry(assignOperationSource(AF.createJoin([
        pattern('?enzyme', 'type', 'Enzyme'),
        pattern('?reaction', 'enzyme', '?enzyme'),
      ]), sourceA));
      const star = entry(assignOperationSource(AF.createJoin([
        pattern('?drug', 'category', 'cathartics'),
        pattern('?drug', 'compound', '?cpd'),
      ]), sourceB));
      await expect(actor.run({ entries: [ chain, star ], context })).resolves.toEqual({ entries: [ star, chain ]});
    });

    it('should prefer fewer sources for equally selective patterns', async() => {
      const multiple = entry(overSources(pattern('?s', 'q', '?o')));
      const single = entry(assignOperationSource(pattern('?s', 'p', '?o'), sourceA));
      await expect(actor.run({ entries: [ multiple, single ], context })).resolves
        .toEqual({ entries: [ single, multiple ]});
    });

    it('should prefer more patterns for equally selective stars', async() => {
      const single = entry(assignOperationSource(pattern('?y', 'p', 'o'), sourceA));
      const group = entry(assignOperationSource(AF.createJoin([
        pattern('?s', 'p', 'o'),
        pattern('?s', 'q', '?x'),
      ]), sourceB));
      await expect(actor.run({ entries: [ single, group ], context })).resolves
        .toEqual({ entries: [ group, single ]});
    });

    it('should order entries without common variables by cost', async() => {
      const first = entry(assignOperationSource(pattern('?x', 'p', '?y'), sourceA));
      const second = entry(assignOperationSource(pattern('?z', 'p', 'o'), sourceA));
      const third = entry(assignOperationSource(pattern('?w', 'p', '?v'), sourceA));
      await expect(actor.run({ entries: [ first, second, third ], context })).resolves
        .toEqual({ entries: [ second, first, third ]});
    });

    it('should prefer lower known cardinalities for otherwise equal entries', async() => {
      const unknown = entry(overSources(pattern('?s', 'p', '?o')));
      const large = entry(overSources(pattern('?s', 'q', '?o')), false, 100);
      const small = entry(overSources(pattern('?s', 'r', '?o')), false, 10);
      await expect(actor.run({ entries: [ unknown, large, small ], context })).resolves
        .toEqual({ entries: [ small, large, unknown ]});
    });

    it('should keep the order of entries with the same cost', async() => {
      const first = entry(overSources(pattern('?s', 'p', '?o')));
      const second = entry(overSources(pattern('?s', 'q', '?o')));
      await expect(actor.run({ entries: [ first, second ], context })).resolves
        .toEqual({ entries: [ first, second ]});
    });

    it('should handle no entries', async() => {
      await expect(actor.run({ entries: [], context })).resolves.toEqual({ entries: []});
    });
  });

  describe('compareCosts', () => {
    it('should compare lexicographically', () => {
      expect(A.compareCosts([ 0, 1 ], [ 0, 1 ])).toBe(0);
      expect(A.compareCosts([ 0, 1 ], [ 0, 2 ])).toBeLessThan(0);
      expect(A.compareCosts([ 1, 0 ], [ 0, 2 ])).toBeGreaterThan(0);
    });
  });

  describe('getPatternCost', () => {
    const none = new Set<string>();

    it('should weigh free variables by their position', () => {
      expect(A.getPatternCost(pattern('s', 'p', 'o'), none)).toBe(1 / 9);
      expect(A.getPatternCost(pattern('?s', 'p', 'o'), none)).toBe(5 / 9);
      expect(A.getPatternCost(pattern('s', '?p', 'o'), none)).toBe(2 / 9);
      expect(A.getPatternCost(pattern('s', 'p', '?o'), none)).toBe(3 / 9);
      expect(A.getPatternCost(AF.createPattern(n('s'), n('p'), n('o'), v('g')), none)).toBe(2 / 9);
      expect(A.getPatternCost(pattern('?s', '?p', '?o'), none)).toBe(8 / 9);
    });

    it('should consider bound variables as constants', () => {
      expect(A.getPatternCost(pattern('?s', '?p', '?o'), new Set([ 's', 'o' ]))).toBe(2 / 9);
    });

    it('should consider the predicate of paths as free', () => {
      const path = AF.createPath(v('s'), AF.createLink(n('q')), n('o'), DF.defaultGraph());
      expect(A.getPatternCost(path, new Set([ 's' ]))).toBe(2 / 9);
    });
  });

  describe('estimateCost', () => {
    const none = new Set<string>();

    it('should estimate a pattern of one source', () => {
      expect(A.estimateCost(assignOperationSource(pattern('?s', 'p', 'o'), sourceA), none))
        .toEqual([ 0, 5 / 9, 0, 1, -1 ]);
    });

    it('should mark entries without variables in common with bound variables', () => {
      expect(A.estimateCost(assignOperationSource(pattern('?s', 'p', 'o'), sourceA), new Set([ 'x' ])))
        .toEqual([ 1, 5 / 9, 0, 1, -1 ]);
    });

    it('should estimate groups from their most selective pattern and their shape', () => {
      const chain = AF.createJoin([ pattern('?s', 'p', '?o'), pattern('?o', 'q', '?x') ]);
      expect(A.estimateCost(assignOperationSource(chain, sourceA), none)).toEqual([ 0, 7 / 9, 1, 1, -2 ]);
      expect(A.estimateCost(assignOperationSource(chain, sourceA), new Set([ 'o' ])))
        .toEqual([ 0, 3 / 9, 1, 1, -2 ]);
    });

    it('should count the sources of an operation over multiple sources', () => {
      expect(A.estimateCost(overSources(pattern('?s', 'p', 'o')), none)).toEqual([ 0, 5 / 9, 0, 2, -1 ]);
    });

    it('should estimate other unions from all their patterns', () => {
      const union = AF.createUnion([
        assignOperationSource(pattern('?s', 'p', 'o'), sourceA),
        assignOperationSource(pattern('?s', 'q', '?o'), sourceB),
      ], false);
      expect(A.estimateCost(union, none)).toEqual([ 0, 5 / 9, 0, 1, -2 ]);
    });

    it('should prefer values', () => {
      expect(A.estimateCost(AF.createValues([ v('s') ], [{ s: n('s') }]), none)).toEqual([ 0, 0, 0, 1, 0 ]);
    });

    it('should estimate operations without patterns as least selective', () => {
      expect(A.estimateCost(AF.createNop(), none)).toEqual([ 0, 1, 0, 1, 0 ]);
    });

    it('should include paths', () => {
      const path = AF.createPath(v('s'), AF.createLink(n('q')), v('o'), DF.defaultGraph());
      expect(A.estimateCost(path, none)).toEqual([ 0, 8 / 9, 0, 1, -1 ]);
    });
  });

  describe('isSameOperationOverSources', () => {
    it('should be false for empty unions', () => {
      expect(A.isSameOperationOverSources(AF.createUnion([], false))).toBe(false);
    });

    it('should be false for inputs without source', () => {
      expect(A.isSameOperationOverSources(AF.createUnion([
        assignOperationSource(pattern('?s', 'p', '?o'), sourceA),
        pattern('?s', 'p', '?o'),
      ], false))).toBe(false);
    });

    it('should be false for different operations', () => {
      expect(A.isSameOperationOverSources(AF.createUnion([
        assignOperationSource(pattern('?s', 'p', '?o'), sourceA),
        assignOperationSource(pattern('?s', 'q', '?o'), sourceB),
      ], false))).toBe(false);
    });

    it('should be true for the same operation over sources', () => {
      expect(A.isSameOperationOverSources(overSources(AF.createJoin([
        pattern('?s', 'p', '?o'),
        pattern('?o', 'q', '?x'),
      ])))).toBe(true);
    });
  });
});
