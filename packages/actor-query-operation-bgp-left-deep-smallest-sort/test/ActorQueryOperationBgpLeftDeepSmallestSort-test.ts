import {
  ActorQueryOperation,
  Bindings,
} from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator, EmptyIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';

import type { Algebra } from 'sparqlalgebrajs';
import { ActorQueryOperationBgpLeftDeepSmallestSort } from '../lib/ActorQueryOperationBgpLeftDeepSmallestSort';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory<RDF.BaseQuad>();

describe('ActorQueryOperationBgpLeftDeepSmallestSort', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new SingletonIterator(Bindings({
          graph: arg.operation.graph,
          object: arg.operation.object,
          predicate: arg.operation.predicate,
          subject: arg.operation.subject,
        })),
        metadata: () => Promise.resolve({ totalItems: (arg.context || ActionContext({})).get('totalItems') }),
        type: 'bindings',
        variables: (arg.context || ActionContext({})).get('variables') || [],
        canContainUndefs: false,
      }),
    };
  });

  describe('The ActorQueryOperationBgpLeftDeepSmallestSort module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpLeftDeepSmallestSort).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpLeftDeepSmallestSort constructor', () => {
      expect(new (<any> ActorQueryOperationBgpLeftDeepSmallestSort)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationBgpLeftDeepSmallestSort);
      expect(new (<any> ActorQueryOperationBgpLeftDeepSmallestSort)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpLeftDeepSmallestSort objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpLeftDeepSmallestSort)(); }).toThrow();
    });
  });

  describe('Static ActorQueryOperationBgpLeftDeepSmallestSort', () => {
    const termNamedNode = DF.namedNode('a');
    const termLiteral = DF.literal('b');
    const termVariableA = DF.variable('a');
    const termVariableB = DF.variable('b');
    const termVariableC = DF.blankNode('c');
    const termVariableD = DF.blankNode('d');
    const termDefaultGraph = DF.defaultGraph();

    const patternMaterialized: any = Object.assign(DF.quad(termNamedNode, termNamedNode, termNamedNode, termNamedNode),
      { type: 'pattern' });
    const patternVarS: any = Object.assign(DF.quad(termVariableA, termNamedNode, termNamedNode, termNamedNode),
      { type: 'pattern' });
    const patternVarP: any = Object.assign(DF.quad(
      termNamedNode, termVariableA, termNamedNode, termNamedNode,
    ),
    { type: 'pattern' });
    const patternVarO: any = Object.assign(DF.quad(termNamedNode, termNamedNode, termVariableA, termNamedNode),
      { type: 'pattern' });
    const patternVarG: any = Object.assign(DF.quad(termNamedNode, termNamedNode, termNamedNode, termVariableA),
      { type: 'pattern' });
    const patternVarAll: any = Object.assign(DF.quad(
      termVariableA, termVariableA, termVariableA, termVariableA,
    ),
    { type: 'pattern' });
    const patternVarMixed: any = Object.assign(DF.quad(termVariableA, termVariableB, termVariableC, termVariableD),
      { type: 'pattern' });

    const valueA = DF.literal('A');
    const valueC = DF.literal('C');

    const bindingsEmpty = Bindings({});
    const bindingsA = Bindings({ '?a': DF.literal('A') });
    const bindingsC = Bindings({ '_:c': DF.literal('C') });
    const bindingsAC = Bindings({ '?a': valueA, '_:c': valueC });

    describe('materializeTerm', () => {
      it('should not materialize a named node with empty bindings', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termNamedNode, bindingsEmpty))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for a', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termNamedNode, bindingsA))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termNamedNode, bindingsC))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for a and c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termNamedNode, bindingsAC))
          .toEqual(termNamedNode);
      });

      it('should not materialize a literal with empty bindings', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termLiteral, bindingsEmpty))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for a', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termLiteral, bindingsA))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termLiteral, bindingsC))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for a and c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termLiteral, bindingsAC))
          .toEqual(termLiteral);
      });

      it('should not materialize a variable with empty bindings', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termVariableC, bindingsEmpty))
          .toEqual(termVariableC);
      });

      it('should not materialize a variable with bindings for a', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termVariableC, bindingsA))
          .toEqual(termVariableC);
      });

      it('should not materialize a blank node with bindings for c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termVariableC, bindingsC))
          .toEqual(termVariableC);
      });

      it('should not materialize a blank node with bindings for a and c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termVariableC, bindingsAC))
          .toEqual(termVariableC);
      });

      it('should not materialize a default graph with empty bindings', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termDefaultGraph, bindingsEmpty))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for a', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termDefaultGraph, bindingsA))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termDefaultGraph, bindingsC))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for a and c', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializeTerm(termDefaultGraph, bindingsAC))
          .toEqual(termDefaultGraph);
      });
    });

    describe('materializePattern', () => {
      it('should not materialize a pattern without variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternMaterialized, bindingsAC))
          .toEqual(patternMaterialized);
      });

      it('should materialize a pattern with variable subject', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarS, bindingsAC))
          .toEqual(Object.assign(DF.quad(valueA, termNamedNode, termNamedNode, termNamedNode),
            { type: 'pattern' }));
      });

      it('should materialize a pattern with variable predicate', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarP, bindingsAC))
          .toEqual(Object.assign(DF.quad(termNamedNode, valueA, termNamedNode, termNamedNode),
            { type: 'pattern' }));
      });

      it('should materialize a pattern with variable object', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarO, bindingsAC))
          .toEqual(Object.assign(DF.quad(termNamedNode, termNamedNode, valueA, termNamedNode),
            { type: 'pattern' }));
      });

      it('should materialize a pattern with variable graph', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarG, bindingsAC))
          .toEqual(Object.assign(DF.quad(termNamedNode, termNamedNode, termNamedNode, valueA),
            { type: 'pattern' }));
      });

      it('should materialize a pattern with all variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarAll, bindingsAC))
          .toEqual(Object.assign(DF.quad(valueA, valueA, valueA, valueA),
            { type: 'pattern' }));
      });

      it('should partially materialize a pattern with mixed variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarMixed, bindingsAC))
          .toEqual(Object.assign(DF.quad(valueA, termVariableB, termVariableC, termVariableD),
            { type: 'pattern' }));
      });
    });

    describe('materializePatterns', () => {
      it('should materialize no patterns in an empty array', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePatterns([], bindingsAC)).toEqual([]);
      });

      it('should materialize all patterns in a non-empty array', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePatterns([ patternVarS, patternVarP ],
          bindingsAC)).toEqual([
          Object.assign(DF.quad(valueA, termNamedNode, termNamedNode, termNamedNode),
            { type: 'pattern' }),
          Object.assign(DF.quad(termNamedNode, valueA, termNamedNode, termNamedNode),
            { type: 'pattern' }),
        ]);
      });
    });

    describe('getTotalItems', () => {
      it('should return Infinity when no metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems()).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when a falsy metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems()).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when an empty metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems({})).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when a metadata with value Infinity is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort
          .getTotalItems({ totalItems: Number.POSITIVE_INFINITY }))
          .toBe(Number.POSITIVE_INFINITY);
      });

      it('should return 10 when a metadata with value 10 is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems({ totalItems: 10 }))
          .toBe(10);
      });
    });

    describe('estimateCombinedTotalItems', () => {
      it('should return Infinity when no metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          <any> null, [ <any> null ],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when no smallest metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          <any> null, [{ totalItems: 10 }],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when no other metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [ <any> null ],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when smallest metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: Number.POSITIVE_INFINITY }, [{ totalItems: 10 }],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when other metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: Number.POSITIVE_INFINITY }],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return Infinity when other one metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: 10 }, { totalItems: Number.POSITIVE_INFINITY }, { totalItems: 20 }],
        )).toBe(Number.POSITIVE_INFINITY);
      });

      it('should return 10 when with smallest metadata 2 and other metadata 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 5 }],
        )).toBe(10);
      });

      it('should return 30 when with smallest metadata 2 and other metadata 5 and 10', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 5 }, { totalItems: 10 }],
        )).toBe(30);
      });

      it('should return 30 when with smallest metadata 2 and other metadata 10 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 10 }, { totalItems: 5 }],
        )).toBe(30);
      });

      it('should return 0 when with smallest metadata 0 and other metadata 10 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 0 }, [{ totalItems: 10 }, { totalItems: 5 }],
        )).toBe(0);
      });

      it('should return 50 when with smallest metadata 2 and other metadata 0 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: 0 }, { totalItems: 5 }],
        )).toBe(50);
      });
    });

    describe('sortPatterns', () => {
      it('should return an empty array for no patterns', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.sortPatterns(
          [],
        )).toEqual([]);
      });

      it('should sort an unsorted by increasing totalItems', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.sortPatterns([
          {
            input: <any> 'I1',
            meta: undefined,
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: 10 },
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: 0 },
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: Number.POSITIVE_INFINITY },
            output: <any> 'O1',
          },
        ])).toEqual([
          {
            input: <any> 'I1',
            meta: { totalItems: 0 },
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: 10 },
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: undefined,
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: Number.POSITIVE_INFINITY },
            output: <any> 'O1',
          },
        ]);
      });
    });

    describe('getCombinedVariables', () => {
      it('should return an empty array for no variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          [],
        )).toEqual([]);
      });

      it('should return an empty array for outputs without variables', () => {
        const data: any = [{ variables: []}, { variables: []}];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data,
        )).toEqual([]);
      });

      it('should return [a] for one output with one variable a', () => {
        const data: any = [{ variables: [ 'a' ]}];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data,
        )).toEqual([ 'a' ]);
      });

      it('should return [a, b, c] for output with variables a, b and b, c', () => {
        const data: any = [{ variables: [ 'a', 'b' ]}, { variables: [ 'b', 'c' ]}];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data,
        )).toEqual([ 'a', 'b', 'c' ]);
      });
    });

    describe('createLeftDeepStream', () => {
      const binder: (patterns: Algebra.Pattern[]) => Promise<BindingsStream> =
        async(patterns: any) => new SingletonIterator(Bindings({
          graph: patterns[0].graph,
          object: patterns[1].object,
          predicate: patterns[2].predicate,
          subject: patterns[3].subject,
        }));
      const pattern1 = <any> DF.quad(DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1'), DF.variable('a'));
      const pattern2 = <any> DF.quad(DF.namedNode('2'), DF.namedNode('2'), DF.variable('b'), DF.namedNode('2'));
      const pattern3 = <any> DF.quad(DF.namedNode('3'), DF.blankNode('c'), DF.namedNode('3'), DF.namedNode('3'));
      const pattern4 = <any> DF.quad(DF.blankNode('d'), DF.namedNode('4'), DF.namedNode('4'), DF.namedNode('4'));
      const binding1 = Bindings({ '?a': DF.namedNode('A') });
      const binding2 = Bindings({ '?b': DF.namedNode('B') });
      const binding3 = Bindings({ '_:c': DF.namedNode('C') });
      it('should return an empty stream for an empty base stream', async() => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new EmptyIterator(), [], binder,
        ))).toEqual([]);
      });

      it('should return a stream with one binding for an input stream with one element and four patterns', async() => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new SingletonIterator(binding1), [ pattern1, pattern2, pattern3, pattern4 ], binder,
        ))).toEqual([
          Bindings({
            graph: DF.namedNode('A'),
            object: DF.variable('b'),
            predicate: DF.blankNode('c'),
            subject: DF.blankNode('d'),
            '?a': DF.namedNode('A'),
          }),
        ]);
      });

      it('should return a stream with 3 bindings for an input stream with 3 elements and four patterns', async() => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new ArrayIterator([ binding1, binding2, binding3 ]), [ pattern1, pattern2, pattern3, pattern4 ], binder,
        ))).toEqual([
          Bindings({
            graph: DF.namedNode('A'),
            object: DF.variable('b'),
            predicate: DF.blankNode('c'),
            subject: DF.blankNode('d'),
            '?a': DF.namedNode('A'),
          }),
          Bindings({
            graph: DF.variable('a'),
            object: DF.namedNode('B'),
            predicate: DF.blankNode('c'),
            subject: DF.blankNode('d'),
            '?b': DF.namedNode('B'),
          }),
          Bindings({
            graph: DF.variable('a'),
            object: DF.variable('b'),
            predicate: DF.blankNode('c'),
            subject: DF.blankNode('d'),
            '_:c': DF.namedNode('C'),
          }),
        ]);
      });
    });
  });

  describe('An ActorQueryOperationBgpLeftDeepSmallestSort instance', () => {
    let actor: ActorQueryOperationBgpLeftDeepSmallestSort;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpLeftDeepSmallestSort({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should not test on empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: []}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on BGPs with a single pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ]}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on BGPs with more than one pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc', 'def' ]}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    const pattern1 = DF.quad(DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1'), DF.variable('a'));
    const pattern2 = DF.quad(DF.variable('d'), DF.namedNode('4'), DF.namedNode('4'), DF.namedNode('4'));
    const patterns = [ pattern1, pattern2 ];

    it('should run with a context and delegate the pattern to the mediator', () => {
      const op = {
        operation: { type: 'bgp', patterns },
        context: ActionContext({ totalItems: 10, variables: [ 'a' ]}),
      };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            graph: DF.variable('a'),
            object: DF.namedNode('1'),
            predicate: DF.namedNode('1'),
            subject: DF.namedNode('1'),
          }),
        ]);
      });
    });

    it('should run without a context and delegate the pattern to the mediator', () => {
      const op = { operation: { type: 'bgp', patterns }};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toEqual({ totalItems: Number.POSITIVE_INFINITY });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            graph: DF.variable('a'),
            object: DF.namedNode('1'),
            predicate: DF.namedNode('1'),
            subject: DF.namedNode('1'),
          }),
        ]);
      });
    });

    it('should run for an empty pattern response', () => {
      const thisMediatorQueryOperation: any = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          type: 'bindings',
          variables: (arg.context || {}).variables || [],
        }),
      };
      const thisActor = new ActorQueryOperationBgpLeftDeepSmallestSort(
        { name: 'actor', bus, mediatorQueryOperation: thisMediatorQueryOperation },
      );
      const op = { operation: { type: 'bgp', patterns }};
      return thisActor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toEqual({ totalItems: 0 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run for responses with unknown metadata', () => {
      const thisMediatorQueryOperation: any = {
        mediate: (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: null,
          type: 'bindings',
          variables: (arg.context || {}).variables || [],
        }),
      };
      const thisActor = new ActorQueryOperationBgpLeftDeepSmallestSort(
        { name: 'actor', bus, mediatorQueryOperation: thisMediatorQueryOperation },
      );
      const op = { operation: { type: 'bgp', patterns }};
      return thisActor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toEqual({ totalItems: Number.POSITIVE_INFINITY });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });
  });
});
