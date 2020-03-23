// tslint:disable:object-literal-sort-keys
import {blankNode, defaultGraph, literal, namedNode, variable} from "@rdfjs/data-model";
import {ArrayIterator, EmptyIterator, SingletonIterator} from "asynciterator";
import {forEachTerms} from "rdf-terms";
import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {ActorQueryOperationLeftJoinLeftDeep} from "../lib/ActorQueryOperationLeftJoinLeftDeep";
import {Factory} from "sparqlalgebrajs";
import {termToString} from "rdf-string";

const arrayifyStream = require('arrayify-stream');
const factory = new Factory();

describe('ActorQueryOperationLeftJoinLeftDeep', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => {
        let filter = false;
        if (arg.operation.type === 'filter') {
          filter = true;
          arg.operation = arg.operation.input;
        }

        const bindings = {};
        let amount = 1;
        forEachTerms(arg.operation, (term) => {
          if (term.termType === 'Variable') {
            if (term.value.startsWith('+')) {
              amount = 2;
            } else if (term.value.startsWith('-')) {
              amount = 0;
            }
            bindings[termToString(term)] = namedNode('bound-' + term.value + (filter ? '-FILTERED' : ''));
          }
        });

        let bindingsStream;
        if (amount === 0) {
          bindingsStream = new EmptyIterator();
        } else if (amount === 1) {
          bindingsStream = new SingletonIterator(Bindings(bindings));
        } else {
          bindingsStream = new ArrayIterator([
            Bindings(bindings).map((v) => namedNode(v.value + '1')),
            Bindings(bindings).map((v) => namedNode(v.value + '2')),
          ]);
        }

        return Promise.resolve({
          bindingsStream,
          metadata: () => arg.operation.rejectMetadata
            ? Promise.reject(new Error('fail'))
            : Promise.resolve({ totalItems: (arg.context || ActionContext({})).get('totalItems') }),
          type: 'bindings',
          variables: (arg.context || ActionContext({})).get('variables') || [],
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoinLeftDeep module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoinLeftDeep).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoinLeftDeep constructor', () => {
      expect(new (ActorQueryOperationLeftJoinLeftDeep as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLeftJoinLeftDeep);
      expect(new (ActorQueryOperationLeftJoinLeftDeep as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoinLeftDeep objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationLeftJoinLeftDeep as any)(); }).toThrow();
    });
  });

  describe('Static methods', () => {
    const termNamedNode = namedNode('a');
    const termLiteral = literal('b');
    const termVariableA = variable('a');
    const termVariableB = variable('b');
    const termVariableC = blankNode('c');
    const termVariableD = blankNode('d');
    const termDefaultGraph = defaultGraph();

    const valueA = literal('A');
    const valueC = literal('C');

    const bindingsEmpty = Bindings({});
    const bindingsA = Bindings({'?a': literal('A')});
    const bindingsC = Bindings({'_:c': literal('C')});
    const bindingsAC = Bindings({'?a': valueA, '_:c': valueC});

    describe('materializeTerm', () => {
      it('should not materialize a named node with empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termNamedNode, bindingsEmpty))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for a', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termNamedNode, bindingsA))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termNamedNode, bindingsC))
          .toEqual(termNamedNode);
      });

      it('should not materialize a named node with bindings for a and c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termNamedNode, bindingsAC))
          .toEqual(termNamedNode);
      });

      it('should not materialize a literal with empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termLiteral, bindingsEmpty))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for a', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termLiteral, bindingsA))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termLiteral, bindingsC))
          .toEqual(termLiteral);
      });

      it('should not materialize a literal with bindings for a and c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termLiteral, bindingsAC))
          .toEqual(termLiteral);
      });

      it('should not materialize a variable with empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termVariableC, bindingsEmpty))
          .toEqual(termVariableC);
      });

      it('should not materialize a variable with bindings for a', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termVariableC, bindingsA))
          .toEqual(termVariableC);
      });

      it('should not materialize a blank node with bindings for c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termVariableC, bindingsC))
          .toEqual(termVariableC);
      });

      it('should not materialize a blank node with bindings for a and c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termVariableC, bindingsAC))
          .toEqual(termVariableC);
      });

      it('should not materialize a default graph with empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termDefaultGraph, bindingsEmpty))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for a', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termDefaultGraph, bindingsA))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termDefaultGraph, bindingsC))
          .toEqual(termDefaultGraph);
      });

      it('should not materialize a default graph with bindings for a and c', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeTerm(termDefaultGraph, bindingsAC))
          .toEqual(termDefaultGraph);
      });
    });

    describe('materializeOperation', () => {
      it('should materialize a quad pattern with empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeOperation(
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          bindingsEmpty))
          .toEqual(factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode));
      });

      it('should materialize a quad pattern with non-empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeOperation(
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          bindingsA))
          .toEqual(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode));
      });

      it('should materialize a BGP with non-empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeOperation(
          factory.createBgp([
            factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
            factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
          ]),
          bindingsA))
          .toEqual(factory.createBgp([
            factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
            factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
          ]));
      });

      it('should materialize a path expression with non-empty bindings', () => {
        return expect(ActorQueryOperationLeftJoinLeftDeep.materializeOperation(
          factory.createPath(termVariableA, null, termVariableC, termNamedNode),
          bindingsA))
          .toEqual(factory.createPath(valueA, null, termVariableC, termNamedNode));
      });
    });

  });

  describe('An ActorQueryOperationLeftJoinLeftDeep instance', () => {
    let actor: ActorQueryOperationLeftJoinLeftDeep;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoinLeftDeep({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on leftjoin', () => {
      const op = { operation: { type: 'leftjoin' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run for one binding in left and right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('a'), variable('b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': namedNode('bound-a'),
            '?b': namedNode('bound-b'),
          }),
        ]);
      });
    });

    it('should run for multiple bindings in left and one binding in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': namedNode('bound-+a1'),
            '?b': namedNode('bound-b'),
          }),
          Bindings({
            '?+a': namedNode('bound-+a2'),
            '?b': namedNode('bound-b'),
          }),
        ]);
      });
    });

    it('should run for one binding in left and multiple bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('a'), variable('+b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': namedNode('bound-a'),
            '?+b': namedNode('bound-+b1'),
          }),
          Bindings({
            '?a': namedNode('bound-a'),
            '?+b': namedNode('bound-+b2'),
          }),
        ]);
      });
    });

    it('should run for multiple binding in left and multiple bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('+b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': namedNode('bound-+a1'),
            '?+b': namedNode('bound-+b1'),
          }),
          Bindings({
            '?+a': namedNode('bound-+a1'),
            '?+b': namedNode('bound-+b2'),
          }),
          Bindings({
            '?+a': namedNode('bound-+a2'),
            '?+b': namedNode('bound-+b1'),
          }),
          Bindings({
            '?+a': namedNode('bound-+a2'),
            '?+b': namedNode('bound-+b2'),
          }),
        ]);
      });
    });

    it('should run for one binding in left and no bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('a'), variable('-b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': namedNode('bound-a'),
          }),
        ]);
      });
    });

    it('should run for multiple bindings in left and no bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('-b'), namedNode('2'), namedNode('b')),
        null,
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': namedNode('bound-+a1'),
          }),
          Bindings({
            '?+a': namedNode('bound-+a2'),
          }),
        ]);
      });
    });

    it('should correctly handle rejecting metadata in left', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('-b'), namedNode('2'), namedNode('b')),
        null,
      );
      operation.left.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toMatchObject({ totalItems: Infinity });
      });
    });

    it('should correctly handle rejecting metadata in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('-b'), namedNode('2'), namedNode('b')),
        null,
      );
      operation.right.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toMatchObject({ totalItems: Infinity });
      });
    });

    it('should correctly handle rejecting metadata in left and right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('+a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('+a'), variable('-b'), namedNode('2'), namedNode('b')),
        null,
      );
      operation.left.rejectMetadata = true;
      operation.right.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toMatchObject({ totalItems: Infinity });
      });
    });

    it('should run for one binding in left and right with an expression', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(variable('a'), namedNode('1'), namedNode('1'), namedNode('1')),
        factory.createPattern(variable('a'), variable('b'), namedNode('2'), namedNode('b')),
        factory.createTermExpression(namedNode('EXPRESSION')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: ['a'] }) };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual(['a']);
        expect(output.type).toEqual('bindings');
        expect(await output.metadata()).toEqual({ totalItems: 100 });
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': namedNode('bound-a'),
            '?b': namedNode('bound-b-FILTERED'),
          }),
        ]);
      });
    });

  });
});
