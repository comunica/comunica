import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {blankNode, defaultGraph, literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator, EmptyIterator, SingletonIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";
import {ActorQueryOperationBgpLeftDeepSmallestSort} from "../lib/ActorQueryOperationBgpLeftDeepSmallestSort";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationBgpLeftDeepSmallestSort', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new SingletonIterator(Bindings({
          graph: arg.operation.graph,
          object: arg.operation.object,
          predicate: arg.operation.predicate,
          subject: arg.operation.subject,
        })),
        metadata: () => Promise.resolve({ totalItems: (arg.context || ActionContext({})).get('totalItems') }),
        type: 'bindings',
        variables: (arg.context || ActionContext({})).get('variables') || [],
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
    const termNamedNode = namedNode('a');
    const termLiteral = literal('b');
    const termVariableA = variable('a');
    const termVariableB = variable('b');
    const termVariableC = blankNode('c');
    const termVariableD = blankNode('d');
    const termDefaultGraph = defaultGraph();

    const patternMaterialized: any = Object.assign(quad(termNamedNode, termNamedNode, termNamedNode, termNamedNode),
      { type: "pattern" });
    const patternVarS: any = Object.assign(quad(termVariableA, termNamedNode, termNamedNode, termNamedNode),
      { type: "pattern" });
    const patternVarP: any = Object.assign(quad<RDF.BaseQuad>(
      termNamedNode, termVariableA, termNamedNode, termNamedNode),
      { type: "pattern" });
    const patternVarO: any = Object.assign(quad(termNamedNode, termNamedNode, termVariableA, termNamedNode),
      { type: "pattern" });
    const patternVarG: any = Object.assign(quad(termNamedNode, termNamedNode, termNamedNode, termVariableA),
      { type: "pattern" });
    const patternVarAll: any = Object.assign(quad<RDF.BaseQuad>(
      termVariableA, termVariableA, termVariableA, termVariableA),
      { type: "pattern" });
    const patternVarMixed: any = Object.assign(quad(termVariableA, termVariableB, termVariableC, termVariableD),
      { type: "pattern" });

    const valueA = literal('A');
    const valueC = literal('C');

    const bindingsEmpty = Bindings({});
    const bindingsA = Bindings({ '?a': literal('A') });
    const bindingsC = Bindings({ '_:c': literal('C') });
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
          .toEqual(Object.assign(quad<RDF.BaseQuad>(valueA, termNamedNode, termNamedNode, termNamedNode),
            { type: "pattern" }));
      });

      it('should materialize a pattern with variable predicate', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarP, bindingsAC))
          .toEqual(Object.assign(quad<RDF.BaseQuad>(termNamedNode, valueA, termNamedNode, termNamedNode),
            { type: "pattern" }));
      });

      it('should materialize a pattern with variable object', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarO, bindingsAC))
          .toEqual(Object.assign(quad(termNamedNode, termNamedNode, valueA, termNamedNode),
            { type: "pattern" }));
      });

      it('should materialize a pattern with variable graph', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarG, bindingsAC))
          .toEqual(Object.assign(quad<RDF.BaseQuad>(termNamedNode, termNamedNode, termNamedNode, valueA),
            { type: "pattern" }));
      });

      it('should materialize a pattern with all variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarAll, bindingsAC))
          .toEqual(Object.assign(quad<RDF.BaseQuad>(valueA, valueA, valueA, valueA),
            { type: "pattern" }));
      });

      it('should partially materialize a pattern with mixed variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePattern(patternVarMixed, bindingsAC))
          .toEqual(Object.assign(quad<RDF.BaseQuad>(valueA, termVariableB, termVariableC, termVariableD),
            { type: "pattern" }));
      });
    });

    describe('materializePatterns', () => {
      it('should materialize no patterns in an empty array', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePatterns([], bindingsAC)).toEqual([]);
      });

      it('should materialize all patterns in a non-empty array', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.materializePatterns([patternVarS, patternVarP],
          bindingsAC)).toEqual([
            Object.assign(quad<RDF.BaseQuad>(valueA, termNamedNode, termNamedNode, termNamedNode),
            { type: "pattern" }),
            Object.assign(quad<RDF.BaseQuad>(termNamedNode, valueA, termNamedNode, termNamedNode),
            { type: "pattern" }),
          ]);
      });
    });

    describe('getTotalItems', () => {
      it('should return Infinity when no metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems()).toBe(Infinity);
      });

      it('should return Infinity when a falsy metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems(null)).toBe(Infinity);
      });

      it('should return Infinity when an empty metadata is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems({})).toBe(Infinity);
      });

      it('should return Infinity when a metadata with value Infinity is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems({ totalItems: Infinity }))
          .toBe(Infinity);
      });

      it('should return 10 when a metadata with value 10 is given', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getTotalItems({ totalItems: 10 }))
          .toBe(10);
      });
    });

    describe('estimateCombinedTotalItems', () => {
      it('should return Infinity when no metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          null, [null])).toBe(Infinity);
      });

      it('should return Infinity when no smallest metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          null, [{ totalItems: 10 }])).toBe(Infinity);
      });

      it('should return Infinity when no other metadata is present', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [null])).toBe(Infinity);
      });

      it('should return Infinity when smallest metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: Infinity }, [{ totalItems: 10 }])).toBe(Infinity);
      });

      it('should return Infinity when other metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: Infinity }])).toBe(Infinity);
      });

      it('should return Infinity when other one metadata is has infinity', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: 10 }, { totalItems: Infinity }, { totalItems: 20 }])).toBe(Infinity);
      });

      it('should return 10 when with smallest metadata 2 and other metadata 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 5 }])).toBe(10);
      });

      it('should return 30 when with smallest metadata 2 and other metadata 5 and 10', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 5 }, { totalItems: 10 }])).toBe(30);
      });

      it('should return 30 when with smallest metadata 2 and other metadata 10 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 2 }, [{ totalItems: 10 }, { totalItems: 5 }])).toBe(30);
      });

      it('should return 0 when with smallest metadata 0 and other metadata 10 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 0 }, [{ totalItems: 10 }, { totalItems: 5 }])).toBe(0);
      });

      it('should return 50 when with smallest metadata 2 and other metadata 0 and 5', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.estimateCombinedTotalItems(
          { totalItems: 10 }, [{ totalItems: 0 }, { totalItems: 5 }])).toBe(50);
      });
    });

    describe('sortPatterns', () => {
      it('should return an empty array for no patterns', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.sortPatterns(
          [])).toEqual([]);
      });

      it('should sort an unsorted by increasing totalItems', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.sortPatterns([
          {
            input: <any> 'I1',
            meta: null,
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
            meta: { totalItems: Infinity },
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
            meta: null,
            output: <any> 'O1',
          },
          {
            input: <any> 'I1',
            meta: { totalItems: Infinity },
            output: <any> 'O1',
          },
        ]);
      });
    });

    describe('getCombinedVariables', () => {
      it('should return an empty array for no variables', () => {
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          [])).toEqual([]);
      });

      it('should return an empty array for outputs without variables', () => {
        const data: any = [{ variables: [] }, { variables: [] }];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data)).toEqual([]);
      });

      it('should return [a] for one output with one variable a', () => {
        const data: any = [{ variables: ['a'] }];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data)).toEqual(['a']);
      });

      it('should return [a, b, c] for output with variables a, b and b, c', () => {
        const data: any = [{ variables: ['a', 'b'] }, { variables: ['b', 'c'] }];
        return expect(ActorQueryOperationBgpLeftDeepSmallestSort.getCombinedVariables(
          data)).toEqual(['a', 'b', 'c']);
      });
    });

    describe('createLeftDeepStream', () => {
      const binder: any = (patterns) => new SingletonIterator(Bindings({
        graph: patterns[0].graph,
        object: patterns[1].object,
        predicate: patterns[2].predicate,
        subject: patterns[3].subject,
      }));
      const pattern1 = <Algebra.Pattern> quad(namedNode('1'), namedNode('1'), namedNode('1'), variable('a'));
      const pattern2 = <Algebra.Pattern> quad(namedNode('2'), namedNode('2'), variable('b'), namedNode('2'));
      const pattern3 = <Algebra.Pattern> quad(namedNode('3'), blankNode('c'), namedNode('3'), namedNode('3'));
      const pattern4 = <Algebra.Pattern> quad(blankNode('d'), namedNode('4'), namedNode('4'), namedNode('4'));
      const binding1 = Bindings({ '?a': namedNode('A') });
      const binding2 = Bindings({ '?b': namedNode('B') });
      const binding3 = Bindings({ '_:c': namedNode('C') });
      it('should return an empty stream for an empty base stream', async () => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new EmptyIterator(), [], binder))).toEqual([]);
      });

      it('should return a stream with one binding for an input stream with one element and four patterns', async () => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new SingletonIterator(binding1), [pattern1, pattern2, pattern3, pattern4], binder))).toEqual([
            Bindings({
              'graph': namedNode('A'),
              'object': namedNode('b'),
              'predicate': namedNode('c'),
              'subject': namedNode('d'),
              '?a': namedNode('A'), // tslint:disable-line:object-literal-sort-keys
            }),
          ]);
      });

      it('should return a stream with 3 bindings for an input stream with 3 elements and four patterns', async () => {
        expect(await arrayifyStream(ActorQueryOperationBgpLeftDeepSmallestSort.createLeftDeepStream(
          new ArrayIterator([binding1, binding2, binding3]), [pattern1, pattern2, pattern3, pattern4], binder),
        )).toEqual([
          Bindings({
            'graph': namedNode('A'),
            'object': namedNode('b'),
            'predicate': blankNode('c'),
            'subject': blankNode('d'),
            '?a': namedNode('A'), // tslint:disable-line:object-literal-sort-keys
          }),
          Bindings({
            'graph': namedNode('a'),
            'object': namedNode('B'),
            'predicate': blankNode('c'),
            'subject': blankNode('d'),
            '?b': namedNode('B'), // tslint:disable-line:object-literal-sort-keys
          }),
          Bindings({
            'graph': namedNode('a'),
            'object': namedNode('b'),
            'predicate': blankNode('c'),
            'subject': blankNode('d'),
            '_:c': namedNode('C'), // tslint:disable-line:object-literal-sort-keys
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
      const op = { operation: { type: 'bgp', patterns: [] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on BGPs with a single pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on BGPs with more than one pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc', 'def' ] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    const pattern1 = quad(namedNode('1'), namedNode('1'), namedNode('1'), variable('a'));
    const pattern2 = quad(variable('d'), namedNode('4'), namedNode('4'), namedNode('4'));
    const patterns = [ pattern1, pattern2 ];

    it('should run with a context and delegate the pattern to the mediator', () => {
      const op = { operation: { type: 'bgp', patterns }, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            graph: namedNode('a'),
            object: namedNode('1'),
            predicate: namedNode('1'),
            subject: namedNode('1'),
          }),
        ]);
      });
    });

    it('should run without a context and delegate the pattern to the mediator', () => {
      const op = { operation: { type: 'bgp', patterns } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: Infinity });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            graph: namedNode('a'),
            object: namedNode('1'),
            predicate: namedNode('1'),
            subject: namedNode('1'),
          }),
        ]);
      });
    });

    it('should run for an empty pattern response', () => {
      const thisMediatorQueryOperation: any = {
        mediate: (arg) => Promise.resolve({
          bindingsStream: new EmptyIterator(),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          type: 'bindings',
          variables: (arg.context || {}).variables || [],
        }),
      };
      const thisActor = new ActorQueryOperationBgpLeftDeepSmallestSort(
        { name: 'actor', bus, mediatorQueryOperation: thisMediatorQueryOperation });
      const op = { operation: { type: 'bgp', patterns } };
      return thisActor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 0 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });

    it('should run for responses with unknown metadata', () => {
      const thisMediatorQueryOperation: any = {
        mediate: (arg) => Promise.resolve({
          bindingsStream: new EmptyIterator(),
          metadata: null,
          type: 'bindings',
          variables: (arg.context || {}).variables || [],
        }),
      };
      const thisActor = new ActorQueryOperationBgpLeftDeepSmallestSort(
        { name: 'actor', bus, mediatorQueryOperation: thisMediatorQueryOperation });
      const op = { operation: { type: 'bgp', patterns } };
      return thisActor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([]);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: Infinity });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([]);
      });
    });
  });
});
