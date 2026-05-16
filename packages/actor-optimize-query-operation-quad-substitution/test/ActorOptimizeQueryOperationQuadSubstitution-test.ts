import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import {
  ActorOptimizeQueryOperationQuadSubstitution,
} from '../lib/ActorOptimizeQueryOperationQuadSubstitution';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationQuadSubstitution', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationQuadSubstitution instance', () => {
    let actor: ActorOptimizeQueryOperationQuadSubstitution;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationQuadSubstitution({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({
        operation: AF.createNop(),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('should not modify operations without GRAPH', async() => {
        const pattern = AF.createPattern(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.variable('o'),
        );
        const result = await actor.run({
          operation: pattern,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph.termType).toBe('DefaultGraph');
      });

      it('should substitute GRAPH <iri> with patterns', async() => {
        const graphOp = AF.createGraph(
          AF.createPattern(
            DF.variable('s'),
            DF.namedNode('p'),
            DF.variable('o'),
          ),
          DF.namedNode('http://example.org/g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph).toEqual(DF.namedNode('http://example.org/g'));
      });

      it('should substitute GRAPH ?var with patterns (no MINUS/GROUP)', async() => {
        const graphOp = AF.createGraph(
          AF.createPattern(
            DF.variable('s'),
            DF.namedNode('p'),
            DF.variable('o'),
          ),
          DF.variable('g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph).toEqual(DF.variable('g'));
      });

      it('should NOT substitute GRAPH ?var with MINUS inside', async() => {
        const graphOp = AF.createGraph(
          AF.createMinus(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            AF.createPattern(DF.variable('s'), DF.namedNode('q'), DF.variable('o')),
          ),
          DF.variable('g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should NOT substitute GRAPH ?var with GROUP inside', async() => {
        const graphOp = AF.createGraph(
          AF.createGroup(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            [],
            [ AF.createBoundAggregate(
              DF.variable('count'),
              'count',
              AF.createTermExpression(DF.variable('s')),
              false,
            ) ],
          ),
          DF.variable('g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should substitute GRAPH <iri> with MINUS inside (IRI is safe)', async() => {
        const graphOp = AF.createGraph(
          AF.createMinus(
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            AF.createPattern(DF.variable('s'), DF.namedNode('q'), DF.variable('o')),
          ),
          DF.namedNode('http://example.org/g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        // IRI + MINUS is safe because there's only one concrete graph
        expect(result.operation.type).toBe(Algebra.Types.MINUS);
        expect((<Algebra.Pattern>(<Algebra.Minus>result.operation).input[0]).graph)
          .toEqual(DF.namedNode('http://example.org/g'));
      });

      it('should NOT substitute GRAPH without patterns', async() => {
        const graphOp = AF.createGraph(
          AF.createValues(
            [ DF.variable('x') ],
            [{ x: DF.literal('1') }],
          ),
          DF.namedNode('http://example.org/g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should handle nested GRAPH operations', async() => {
        // GRAPH ?g { GRAPH <iri> { ?s ?p ?o } }
        const innerGraph = AF.createGraph(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          DF.namedNode('http://example.org/inner'),
        );
        const outerGraph = AF.createGraph(innerGraph, DF.variable('g'));
        const result = await actor.run({
          operation: outerGraph,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        // Outer GRAPH ?g has no own patterns (inner GRAPH has them), so it should be kept
        // Inner GRAPH <iri> should be substituted
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
        const innerResult = (<Algebra.Graph>result.operation).input;
        expect(innerResult.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>innerResult).graph).toEqual(DF.namedNode('http://example.org/inner'));
      });

      it('should not substitute variable GRAPH with only subquery patterns', async() => {
        // GRAPH ?g { SELECT ?x WHERE { ?x ?p ?g } }
        // Patterns are only inside subquery → unsafe for variable graph
        const graphOp = AF.createGraph(
          AF.createProject(
            AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('g')),
            [ DF.variable('x') ],
          ),
          DF.variable('g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        // GRAPH should be kept (not substituted)
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should substitute variable GRAPH with outer patterns but not recurse into subquery', async() => {
        // GRAPH ?g { ?s ?p ?o . { SELECT ?x WHERE { ?x ?q ?r } } }
        const graphOp = AF.createGraph(
          AF.createJoin([
            AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
            AF.createProject(
              AF.createPattern(DF.variable('x'), DF.namedNode('q'), DF.variable('r')),
              [ DF.variable('x') ],
            ),
          ]),
          DF.variable('g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        // GRAPH should be substituted (has outer patterns)
        expect(result.operation.type).toBe(Algebra.Types.JOIN);
        const join = <Algebra.Join>result.operation;
        // Outer pattern should have ?g as graph
        expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.variable('g'));
        // Subquery pattern should keep DefaultGraph (not substituted)
        const project = <Algebra.Project>join.input[1];
        expect((<Algebra.Pattern>project.input).graph.termType).toBe('DefaultGraph');
      });

      it('should handle GRAPH with join of patterns', async() => {
        const graphOp = AF.createGraph(
          AF.createJoin([
            AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
            AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
          ]),
          DF.namedNode('http://example.org/g'),
        );
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(result.operation.type).toBe(Algebra.Types.JOIN);
        const join = <Algebra.Join>result.operation;
        expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('http://example.org/g'));
        expect((<Algebra.Pattern>join.input[1]).graph).toEqual(DF.namedNode('http://example.org/g'));
      });

      it('should preserve pattern metadata during substitution', async() => {
        const pattern = AF.createPattern(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.variable('o'),
        );
        Object.assign(pattern, { metadata: { scopedSource: { source: 'test' }}});
        const graphOp = AF.createGraph(pattern, DF.namedNode('http://example.org/g'));
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect((<Algebra.Pattern>result.operation).metadata).toEqual({ scopedSource: { source: 'test' }});
      });

      it('should not substitute patterns that already have a non-default graph', async() => {
        const pattern = AF.createPattern(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.variable('o'),
          DF.namedNode('http://example.org/existing'),
        );
        const graphOp = AF.createGraph(pattern, DF.namedNode('http://example.org/g'));
        const result = await actor.run({
          operation: graphOp,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        // The pattern already has a named graph, so it should be kept as-is
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph)
          .toEqual(DF.namedNode('http://example.org/existing'));
      });
    });
  });

  describe('isSafeToSubstitute', () => {
    it('should return true for IRI graph with patterns', () => {
      const graphOp = AF.createGraph(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return true for variable graph with patterns and no MINUS/GROUP', () => {
      const graphOp = AF.createGraph(
        AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
        DF.variable('g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return false for variable graph with MINUS', () => {
      const graphOp = AF.createGraph(
        AF.createMinus(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          AF.createPattern(DF.variable('s'), DF.namedNode('q'), DF.variable('o')),
        ),
        DF.variable('g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(false);
    });

    it('should return false for variable graph with GROUP', () => {
      const graphOp = AF.createGraph(
        AF.createGroup(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          [],
          [ AF.createBoundAggregate(DF.variable('count'), 'count', AF.createTermExpression(DF.variable('s')), false) ],
        ),
        DF.variable('g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(false);
    });

    it('should return true for IRI graph with MINUS', () => {
      const graphOp = AF.createGraph(
        AF.createMinus(
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          AF.createPattern(DF.variable('s'), DF.namedNode('q'), DF.variable('o')),
        ),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return false when there are no patterns', () => {
      const graphOp = AF.createGraph(
        AF.createValues([ DF.variable('x') ], [{ x: DF.literal('1') }]),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(false);
    });

    it('should return true for PATH operations', () => {
      const graphOp = AF.createGraph(
        AF.createPath(
          DF.variable('s'),
          AF.createLink(DF.namedNode('p')),
          DF.variable('o'),
        ),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return true for NPS operations', () => {
      const graphOp = AF.createGraph(
        AF.createNps([ DF.namedNode('p') ]),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return true for LINK operations', () => {
      const graphOp = AF.createGraph(
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return false for variable graph with only subquery patterns', () => {
      // GRAPH ?g { SELECT ?x WHERE { ?x ?p ?g } }
      // Patterns are only inside the PROJECT (subquery) - not safe for variable graphs
      const graphOp = AF.createGraph(
        AF.createProject(
          AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('g')),
          [ DF.variable('x') ],
        ),
        DF.variable('g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(false);
    });

    it('should return true for IRI graph with only subquery patterns', () => {
      // GRAPH <g1> { SELECT ?x WHERE { ?x ?p ?o } }
      // IRI graphs can safely substitute into subqueries
      const graphOp = AF.createGraph(
        AF.createProject(
          AF.createPattern(DF.variable('x'), DF.variable('p'), DF.variable('o')),
          [ DF.variable('x') ],
        ),
        DF.namedNode('http://example.org/g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });

    it('should return true for variable graph with outer patterns and subquery', () => {
      // GRAPH ?g { ?s ?p ?o . { SELECT ?x WHERE { ?x ?q ?r } } }
      // There are patterns outside the subquery - safe
      const graphOp = AF.createGraph(
        AF.createJoin([
          AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
          AF.createProject(
            AF.createPattern(DF.variable('x'), DF.namedNode('q'), DF.variable('r')),
            [ DF.variable('x') ],
          ),
        ]),
        DF.variable('g'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)).toBe(true);
    });
  });

  describe('substituteGraphInOperation', () => {
    it('should substitute default graph in patterns', () => {
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        pattern,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should substitute default graph in paths', () => {
      const path = AF.createPath(
        DF.variable('s'),
        AF.createLink(DF.namedNode('p')),
        DF.variable('o'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        path,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should not substitute non-default graph', () => {
      const pattern = AF.createPattern(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.namedNode('http://example.org/existing'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        pattern,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('http://example.org/existing'));
    });

    it('should substitute in nested operations', () => {
      const join = AF.createJoin([
        AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
        AF.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
      ]);
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        join,
        DF.namedNode('http://example.org/g'),
      );
      expect(result.type).toBe(Algebra.Types.JOIN);
      const joinResult = <Algebra.Join>result;
      expect((<Algebra.Pattern>joinResult.input[0]).graph).toEqual(DF.namedNode('http://example.org/g'));
      expect((<Algebra.Pattern>joinResult.input[1]).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should not recurse into PROJECT for variable graphs', () => {
      // Variable graph: should not substitute into subquery patterns
      const subquery = AF.createProject(
        AF.createPattern(DF.variable('x'), DF.namedNode('p'), DF.variable('y')),
        [ DF.variable('x') ],
      );
      const join = AF.createJoin([
        AF.createPattern(DF.variable('s'), DF.namedNode('q'), DF.variable('o')),
        subquery,
      ]);
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        join,
        DF.variable('g'),
      );
      const joinResult = <Algebra.Join>result;
      // Outer pattern should be substituted
      expect((<Algebra.Pattern>joinResult.input[0]).graph).toEqual(DF.variable('g'));
      // Subquery pattern should NOT be substituted
      const project = <Algebra.Project>joinResult.input[1];
      expect((<Algebra.Pattern>project.input).graph.termType).toBe('DefaultGraph');
    });

    it('should recurse into PROJECT for IRI graphs', () => {
      // IRI graph: safe to substitute into subquery patterns
      const subquery = AF.createProject(
        AF.createPattern(DF.variable('x'), DF.namedNode('p'), DF.variable('y')),
        [ DF.variable('x') ],
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        subquery,
        DF.namedNode('http://example.org/g'),
      );
      const project = <Algebra.Project>result;
      expect((<Algebra.Pattern>project.input).graph).toEqual(DF.namedNode('http://example.org/g'));
    });

    it('should not substitute path with non-default graph', () => {
      const path = AF.createPath(
        DF.variable('s'),
        AF.createLink(DF.namedNode('p')),
        DF.variable('o'),
        DF.namedNode('http://example.org/existing'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.substituteGraphInOperation(
        AF,
        path,
        DF.namedNode('http://example.org/g'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('http://example.org/existing'));
    });
  });
});
