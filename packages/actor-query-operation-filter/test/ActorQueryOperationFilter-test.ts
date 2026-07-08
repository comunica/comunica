import {
  ActorFunctionFactoryExpressionConcat,
} from '@comunica/actor-function-factory-expression-concat';
import { ActorFunctionFactoryTermAddition } from '@comunica/actor-function-factory-term-addition';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermIri } from '@comunica/actor-function-factory-term-iri';
import { ActorFunctionFactoryTermStr } from '@comunica/actor-function-factory-term-str';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import * as sparqlee from '@comunica/utils-expression-evaluator';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import {
  createFuncMediator,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
} from '@comunica/utils-jest';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser } from '@traqula/parser-sparql-1-2';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationFilter } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});
const AF = new AlgebraFactory(DF);
const parser = new Parser();

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
  const sparqlQuery = <Algebra.Project> toAlgebra(parser.parse(template(query)));
  // Extract filter expression from complete query
  return (<Algebra.Filter>sparqlQuery.input).expression;
}

describe('ActorQueryOperationFilter', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let context: IActionContext;
  const truthyExpression = parse('"nonemptystring"');
  const falsyExpression = parse('""');
  const erroringExpression = parse('?a + ?a');
  const unknownExpression = AF.createOperatorExpression('DUMMY', []);

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({
          cardinality: 3,
          variables: [{ variable: DF.variable('a'), canBeUndef: false }],
        }),
        operated: arg,
        type: 'bindings',
      }),
    };

    context = getMockEEActionContext();
  });

  describe('The ActorQueryOperationFilter module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilter).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilter constructor', () => {
      expect(new (<any> ActorQueryOperationFilter)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilter);
      expect(new (<any> ActorQueryOperationFilter)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilter objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationFilter)();
      }).toThrow(`Class constructor ActorQueryOperationFilter cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationFilter instance', () => {
    let actor: ActorQueryOperationFilter;
    let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

    beforeEach(() => {
      mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
        mediatorQueryOperation,
        mediatorFunctionFactory: createFuncMediator([
          args => new ActorFunctionFactoryTermAddition(args),
          args => new ActorFunctionFactoryTermEquality(args),
          args => new ActorFunctionFactoryTermStr(args),
          args => new ActorFunctionFactoryExpressionConcat(args),
          args => new ActorFunctionFactoryTermIri(args),
        ], {}),
      });

      actor = new ActorQueryOperationFilter({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorExpressionEvaluatorFactory,
      });
    });

    it('should test on filter', async() => {
      const op = { operation: AF.createFilter(AF.createBgp([]), truthyExpression), context };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should pass test but not run on unsupported operators', async() => {
      const op = { operation: AF.createFilter(AF.createBgp([]), unknownExpression), context };
      await expect(actor.test(op)).resolves.toPassTestVoid();
      await expect(actor.run(op, undefined)).rejects.toThrow(
        `No actors are able to reply to a message`,
      );
    });

    it('should not test on non-filter', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports filter operations, but got some-other-type`);
    });

    it('should return the full stream for a truthy filter', async() => {
      const op = {
        operation: AF.createFilter(AF.createBgp([]), truthyExpression),
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
    });

    it('should return an empty stream for a falsy filter', async() => {
      const op = {
        operation: AF.createFilter(AF.createBgp([]), falsyExpression),
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
      expect(output.type).toBe('bindings');
    });

    it('should return an empty stream when the expressions error', async() => {
      const op = {
        operation: AF.createFilter(AF.createBgp([]), erroringExpression),
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
      expect(output.type).toBe('bindings');
    });

    it('Should log warning for an expressionError', async() => {
      // The order is very important. This item requires isExpressionError to still have it's right definition.
      const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
      const op = {
        operation: AF.createFilter(AF.createBgp([]), erroringExpression),
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      output.bindingsStream.on('data', () => {
        // This is here to force the stream to start.
      });
      await new Promise<void>(resolve => output.bindingsStream.on('end', resolve));
      expect(logWarnSpy).toHaveBeenCalledTimes(3);
      for (const [ index, call ] of logWarnSpy.mock.calls.entries()) {
        if (index === 0) {
          const dataCB = <() => { error: any; bindings: Bindings }>call[2];
          const { error, bindings } = dataCB();
          // eslint-disable-next-line jest/no-conditional-expect
          expect(isExpressionError(error)).toBeTruthy();
          // eslint-disable-next-line jest/no-conditional-expect
          expect(bindings).toBe(`{
  "a": "\\"1\\""
}`);
        }
      }
    });

    it('should emit an error for a hard erroring filter', async() => {
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      // eslint-disable-next-line jest/prefer-spy-on
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op = {
        operation: AF.createFilter(AF.createBgp([]), erroringExpression),
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      output.bindingsStream.on('data', () => {
        // This is here to force the stream to start.
      });
      await new Promise<void>(resolve => output.bindingsStream.on('error', () => resolve()));
    });

    it('should use and respect the baseIRI from the expression context', async() => {
      const expression = parse('str(IRI(?a)) = concat("http://example.com/", ?a)');
      const op: any = {
        operation: AF.createFilter(AF.createBgp([]), expression),
        context: getMockEEActionContext(new ActionContext({ [KeysInitQuery.baseIRI.name]: 'http://example.com' })),
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op, undefined);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, variables: [{ variable: DF.variable('a'), canBeUndef: false }]});
    });
  });
});
