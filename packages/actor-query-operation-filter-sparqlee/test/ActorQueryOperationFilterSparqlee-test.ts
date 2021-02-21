import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { KeysInitSparql } from '@comunica/context-entries';
import { Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, translate } from 'sparqlalgebrajs';
import * as sparqlee from 'sparqlee';
import { ActorQueryOperationFilterSparqlee } from '../lib/ActorQueryOperationFilterSparqlee';
const arrayifyStream = require('arrayify-stream');
const DF = new DataFactory();

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
  let bus: any;
  let mediatorQueryOperation: any;
  const simpleSPOInput = new Factory().createBgp([ new Factory().createPattern(
    DF.variable('s'),
    DF.variable('p'),
    DF.variable('o'),
  ) ]);
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
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': DF.literal('1') }),
          Bindings({ '?a': DF.literal('2') }),
          Bindings({ '?a': DF.literal('3') }),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: [ 'a' ],
        canContainUndefs: false,
      }),
    };
  });

  describe('The ActorQueryOperationFilterSparqlee module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterSparqlee).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterSparqlee constructor', () => {
      expect(new (<any> ActorQueryOperationFilterSparqlee)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterSparqlee);
      expect(new (<any> ActorQueryOperationFilterSparqlee)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterSparqlee objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFilterSparqlee)(); }).toThrow();
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
      const op = { operation: { type: 'filter', expression: truthyExpression }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should fail on unsupported operators', () => {
      const op = { operation: { type: 'filter', expression: unknownExpression }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should return the full stream for a truthy filter', async() => {
      const op = { operation: { type: 'filter', input: {}, expression: truthyExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('2') }),
        Bindings({ '?a': DF.literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should return an empty stream for a falsy filter', async() => {
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should return an empty stream when the expressions error', async() => {
      const op = { operation: { type: 'filter', input: {}, expression: erroringExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    it('should emit an error for a hard erroring filter', async next => {
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op = { operation: { type: 'filter', input: {}, expression: erroringExpression }};
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      output.bindingsStream.on('error', () => next());
    });

    it('should use and respect the baseIRI from the expression context', async() => {
      const expression = parse('str(IRI(?a)) = concat("http://example.com/", ?a)');
      const context = Map({
        [KeysInitSparql.baseIRI]: 'http://example.com',
      });
      const op = { operation: { type: 'filter', input: {}, expression }, context };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': DF.literal('1') }),
        Bindings({ '?a': DF.literal('2') }),
        Bindings({ '?a': DF.literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await (<any> output).metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject([ 'a' ]);
      expect(output.canContainUndefs).toEqual(false);
    });

    describe('should be able to handle EXIST filters', () => {
      it('like a simple EXIST that is true', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(Map(), actor.mediatorQueryOperation);
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        expect(await result).toBe(true);
      });

      it('like a simple EXIST that is false', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(Map(), actor.mediatorQueryOperation);
        mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        expect(await result).toBe(false);
      });

      it('like a NOT EXISTS', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(Map(), actor.mediatorQueryOperation);
        mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ totalItems: 0 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          true,
          factory.createBgp([]),
        );
        const result = resolver(expr, Bindings({}));
        expect(await result).toBe(true);
      });

      it('like an EXIST that errors', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(Map(), actor.mediatorQueryOperation);
        const bindingsStream = new ArrayIterator([{}, {}, {}]).transform({
          autoStart: false,
          transform(item, done, push) {
            push(item);
            bindingsStream.emit('error', 'Test error');
            done();
          },
        });
        mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
          bindingsStream,
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: [ 'a' ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        await expect(resolver(expr, Bindings({}))).rejects.toBeTruthy();
      });
    });
  });
});
