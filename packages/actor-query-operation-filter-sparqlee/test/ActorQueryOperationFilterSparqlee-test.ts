// tslint:disable:object-literal-sort-keys
import { literal, variable } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { Map } from "immutable";
import { Algebra, Factory, translate } from "sparqlalgebrajs";
import * as sparqlee from "sparqlee";
const arrayifyStream = require('arrayify-stream');

import { KEY_CONTEXT_BASEIRI } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ActorQueryOperationFilterSparqlee } from "../lib/ActorQueryOperationFilterSparqlee";

function template(expr: string) {
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
PREFIX err: <http://www.w3.org/2005/xqt-errors#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT * WHERE { ?s ?p ?o FILTER (${expr})}
`;
}

function parse(query: string): Algebra.Expression {
  const sparqlQuery = translate(template(query));
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

describe('ActorQueryOperationFilterSparqlee', () => {
  let bus;
  let mediatorQueryOperation;
  const simpleSPOInput = new Factory().createBgp([new Factory().createPattern(
    variable('s'),
    variable('p'),
    variable('o'),
  )]);
  const truthyExpression = parse('"nonemptystring"');
  const falsyExpression = parse('""');
  const erroringExpression = parse('?a + ?a');
  const unknownExpression = {
    args: [],
    expressionType: 'operator',
    operator: 'DUMMY',
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationFilterSparqlee module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterSparqlee).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterSparqlee constructor', () => {
      expect(new (ActorQueryOperationFilterSparqlee as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterSparqlee);
      expect(new (ActorQueryOperationFilterSparqlee as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterSparqlee objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationFilterSparqlee as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationFilterSparqlee instance', () => {
    let actor: ActorQueryOperationFilterSparqlee;
    let factory: Factory;

    beforeEach(() => {
      actor = new ActorQueryOperationFilterSparqlee({ name: 'actor', bus, mediatorQueryOperation });
      factory = new Factory();
    });

    it('should test on filter', () => {
      const op = { operation: { type: 'filter', expression: truthyExpression } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should fail on unsupported operators', () => {
      const op = { operation: { type: 'filter', expression: unknownExpression } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should return the full stream for a truthy filter', async () => {
      const op = { operation: { type: 'filter', input: {}, expression: truthyExpression } };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
      expect(output.variables).toMatchObject(['a']);
    });

    it('should return an empty stream for a falsy filter', async () => {
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression } };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 0 }));
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject(['a']);
    });

    it('should return an empty stream when the expressions error', async () => {
      const op = { operation: { type: 'filter', input: {}, expression: erroringExpression } };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 0 }));
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject(['a']);
    });

    it('should emit an error for a hard erroring filter', async (next) => {
      spyOn(sparqlee, 'isExpressionError').and.returnValue(false);
      const op = { operation: { type: 'filter', input: {}, expression: erroringExpression } };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      output.bindingsStream.on('error', () => next());
    });

    it('should use and respect the baseIRI from the expression context', async () => {
      const expression = parse('str(IRI(?a)) = concat("http://example.com/", ?a)');
      const context = Map({
        [KEY_CONTEXT_BASEIRI]: "http://example.com",
      });
      const op = { operation: { type: 'filter', input: {}, expression }, context };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
      expect(output.variables).toMatchObject(['a']);
    });

    describe('should be able to handle EXIST filters', () => {
      it('like a simple EXIST that is true', async () => {
        // tslint:disable-next-line: no-string-literal
        const resolver = actor['createExistenceResolver'](Map());
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        return expect(await result).toBe(true);
      });

      it('like a simple EXIST that is false', async () => {
        // tslint:disable-next-line: no-string-literal
        const resolver = actor['createExistenceResolver'](Map());
        mediatorQueryOperation.mediate = (arg) => Promise.resolve({
          bindingsStream: new ArrayIterator([]),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        return expect(await result).toBe(false);
      });

      it('like a NOT EXISTS', async () => {
        // tslint:disable-next-line: no-string-literal
        const resolver = actor['createExistenceResolver'](Map());
        mediatorQueryOperation.mediate = (arg) => Promise.resolve({
          bindingsStream: new ArrayIterator([]),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          true,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        return expect(await result).toBe(true);
      });

      it('like an EXIST that errors', async () => {
        // tslint:disable-next-line: no-string-literal
        const resolver = actor['createExistenceResolver'](Map());
        const bindingsStream = new ArrayIterator([{}, {}, {}]).transform({
          transform: (item, done) => {
            bindingsStream._push(item);
            bindingsStream.emit('error', 'Test error');
          },
        });
        mediatorQueryOperation.mediate = (arg) => Promise.resolve({
          bindingsStream,
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: ['a'],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        return expect(resolver(expr, Bindings({}))).rejects.toBeTruthy();
      });
    });

    describe('should be able to substitute variables', () => {
      it('in single terms that are variables', () => {
        const bindings = Bindings({ '?a': literal("1") });
        // tslint:disable-next-line: no-string-literal
        const substituted = actor['substituteSingle'](variable('a'), bindings);
        expect(substituted).toEqual(literal("1"));
      });

      it('in single terms that are not variables', () => {
        const bindings = Bindings({ '?a': literal("3") });
        // tslint:disable-next-line: no-string-literal
        const substituted = actor['substituteSingle'](variable('a'), bindings);
        expect(substituted).toEqual(literal("3"));
      });

      describe('in algebra operations', () => {
        it('like pattern', () => {
          const bindings = Bindings({
            '?a': literal("1"),
            '?b': literal("2"),
          });
          const operation = factory.createPattern(variable('a'), variable('b'), variable('c'), variable('g'));
          // tslint:disable-next-line: no-string-literal
          const substituted = actor['substitute'](operation, bindings);
          expect(substituted).toEqual(
            factory.createPattern(literal('1'), literal('2'), variable('c'), variable('g')),
          );
        });

        it('like path', () => {
          const bindings = Bindings({
            '?a': literal("1"),
            '?b': literal("2"),
          });
          const pathOp = factory.createValues([], [{}]);
          const operation = factory.createPath(variable('a'), pathOp, variable('b'));
          // tslint:disable-next-line: no-string-literal
          const substituted = actor['substitute'](operation, bindings);
          expect(substituted).toEqual(
            factory.createPath(literal('1'), pathOp, literal('2')),
          );
        });

        it('like BGP', () => {
          const bindings = Bindings({
            '?a': literal("1"),
            '?b': literal("2"),
          });
          const operation = factory.createBgp([
            factory.createPattern(variable('a'), variable('b'), variable('c'), variable('g')),
            factory.createPattern(literal('5'), literal('6'), variable('a')),
          ]);
          // tslint:disable-next-line: no-string-literal
          const substituted = actor['substitute'](operation, bindings);
          expect(substituted).toEqual(factory.createBgp([
            factory.createPattern(literal('1'), literal('2'), variable('c'), variable('g')),
            factory.createPattern(literal('5'), literal('6'), literal('1')),
          ]));
        });
      });
    });
  });
});
