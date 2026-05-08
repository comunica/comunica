import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import {
  ActorOptimizeQueryOperationQuadSubstitution,
} from '../lib/ActorOptimizeQueryOperationQuadSubstitution';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('ActorOptimizeQueryOperationQuadSubstitution', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorOptimizeQueryOperationQuadSubstitution instance', () => {
    let actor: ActorOptimizeQueryOperationQuadSubstitution;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationQuadSubstitution({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ operation: <any>undefined, context })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('should push down GRAPH with a named node', async() => {
        const operation = AF.createGraph(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.namedNode('g1'),
        );
        const result = await actor.run({ operation, context });
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph).toEqual(DF.namedNode('g1'));
      });

      it('should push down GRAPH with a variable when safe', async() => {
        const operation = AF.createGraph(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.variable('g'),
        );
        const result = await actor.run({ operation, context });
        expect(result.operation.type).toBe(Algebra.Types.PATTERN);
        expect((<Algebra.Pattern>result.operation).graph).toEqual(DF.variable('g'));
      });

      it('should not push down GRAPH with a variable when unsafe (MINUS)', async() => {
        const operation = AF.createGraph(
          AF.createMinus(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          ),
          DF.variable('g'),
        );
        const result = await actor.run({ operation, context });
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should not push down GRAPH with a variable when unsafe (PROJECT)', async() => {
        const operation = AF.createGraph(
          AF.createProject(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            [ DF.variable('s') ],
          ),
          DF.variable('g'),
        );
        const result = await actor.run({ operation, context });
        expect(result.operation.type).toBe(Algebra.Types.GRAPH);
      });

      it('should handle nested operations with GRAPH named node', async() => {
        const operation = AF.createGraph(
          AF.createJoin([
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
            AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          ]),
          DF.namedNode('g1'),
        );
        const result = await actor.run({ operation, context });
        expect(result.operation.type).toBe(Algebra.Types.JOIN);
        const join = <Algebra.Join>result.operation;
        expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('g1'));
        expect((<Algebra.Pattern>join.input[1]).graph).toEqual(DF.namedNode('g1'));
      });

      it('should pass through context unchanged', async() => {
        const operation = AF.createGraph(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          DF.namedNode('g1'),
        );
        const result = await actor.run({ operation, context });
        expect(result.context).toBe(context);
      });
    });
  });

  describe('isSafeForQuadSubstitution', () => {
    it('should return true for a simple pattern', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });

    it('should return true for a join of patterns', () => {
      const op = AF.createJoin([
        AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });

    it('should return false when MINUS is present', () => {
      const op = AF.createMinus(
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(false);
    });

    it('should return false when PROJECT is present', () => {
      const op = AF.createProject(
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        [ DF.variable('s') ],
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(false);
    });

    it('should return false when VALUES binds the graph variable', () => {
      const op = AF.createValues(
        [ DF.variable('g') ],
        [{ '?g': DF.namedNode('val1') }],
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(false);
    });

    it('should return true when VALUES binds a different variable', () => {
      const op = AF.createValues(
        [ DF.variable('x') ],
        [{ '?x': DF.namedNode('val1') }],
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });

    it('should return false when EXTEND binds the graph variable', () => {
      const op = AF.createExtend(
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o')),
        DF.variable('g'),
        AF.createTermExpression(DF.namedNode('someValue')),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(false);
    });

    it('should return true when EXTEND binds a different variable', () => {
      const op = AF.createExtend(
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o')),
        DF.variable('x'),
        AF.createTermExpression(DF.namedNode('someValue')),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });

    it('should not recurse into nested GRAPH operations', () => {
      const op = AF.createGraph(
        AF.createMinus(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ),
        DF.namedNode('inner'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });

    it('should not recurse into SERVICE operations', () => {
      const op = AF.createService(
        AF.createMinus(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ),
        DF.namedNode('http://service.example'),
      );
      expect(ActorOptimizeQueryOperationQuadSubstitution.isSafeForQuadSubstitution(
        op,
        DF.variable('g'),
      )).toBe(true);
    });
  });

  describe('pushDownGraph', () => {
    it('should replace default graph in patterns', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('g1'));
    });

    it('should not replace non-default graph in patterns', () => {
      const op = AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('existing'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.namedNode('existing'));
    });

    it('should replace default graph in paths', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('g1'));
    });

    it('should not replace non-default graph in paths', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
        DF.namedNode('existing'),
      );
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<Algebra.Path>result).graph).toEqual(DF.namedNode('existing'));
    });

    it('should not recurse into nested GRAPH operations', () => {
      const op = AF.createJoin([
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        AF.createGraph(
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.namedNode('inner'),
        ),
      ]);
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      const join = <Algebra.Join>result;
      expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('g1'));
      const innerGraph = <Algebra.Graph>join.input[1];
      expect(innerGraph.type).toBe(Algebra.Types.GRAPH);
      expect((<Algebra.Pattern>innerGraph.input).graph.termType).toBe('DefaultGraph');
    });

    it('should not recurse into SERVICE operations', () => {
      const op = AF.createJoin([
        AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        AF.createService(
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.namedNode('http://service.example'),
        ),
      ]);
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      const join = <Algebra.Join>result;
      expect((<Algebra.Pattern>join.input[0]).graph).toEqual(DF.namedNode('g1'));
      const service = <Algebra.Service>join.input[1];
      expect(service.type).toBe(Algebra.Types.SERVICE);
      expect((<Algebra.Pattern>service.input).graph.termType).toBe('DefaultGraph');
    });

    it('should push down variable graph terms', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.variable('g'),
      );
      expect((<Algebra.Pattern>result).graph).toEqual(DF.variable('g'));
    });

    it('should preserve pattern metadata', () => {
      const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
      (<any>op).metadata = { scopedSource: 'test' };
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<any>result).metadata).toEqual({ scopedSource: 'test' });
    });

    it('should preserve path metadata', () => {
      const op = AF.createPath(
        DF.namedNode('s'),
        AF.createLink(DF.namedNode('p')),
        DF.namedNode('o'),
      );
      (<any>op).metadata = { scopedSource: 'test' };
      const result = ActorOptimizeQueryOperationQuadSubstitution.pushDownGraph(
        AF,
        op,
        DF.namedNode('g1'),
      );
      expect((<any>result).metadata).toEqual({ scopedSource: 'test' });
    });
  });
});
