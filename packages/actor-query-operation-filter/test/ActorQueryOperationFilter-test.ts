import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import * as sparqlee from '@comunica/expression-evaluator';
import { isExpressionError } from '@comunica/expression-evaluator';
import { getMockEEActionContext, getMockMediatorExpressionEvaluatorFactory } from '@comunica/jest';
import type { IQueryOperationResultBindings, Bindings, IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, translate } from 'sparqlalgebrajs';
import { ActorQueryOperationFilter } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});

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

describe('ActorQueryOperationFilter', () => {
  let bus: any;
  let mediatorQueryOperation: any;
  let context: IActionContext;

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
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
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
    let factory: Factory;
    let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

    beforeEach(() => {
      mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
        mediatorQueryOperation,
        mediatorFunctionFactory: createFuncMediator(),
      });

      actor = new ActorQueryOperationFilter({
        name: 'actor',
        bus,
        mediatorQueryOperation,
        mediatorExpressionEvaluatorFactory,
      });
      factory = new Factory();
    });

    it('should test on filter', async() => {
      const op: any = { operation: { type: 'filter', expression: truthyExpression }, context };
      await expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should fail on unsupported operators', async() => {
      const op: any = { operation: { type: 'filter', expression: unknownExpression }, context };
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', async() => {
      const op: any = { operation: { type: 'some-other-type' }};
      await expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should return the full stream for a truthy filter', async() => {
      const op: any = {
        operation: { type: 'filter', input: {}, expression: truthyExpression },
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    it('should return an empty stream for a falsy filter', async() => {
      const op: any = {
        operation: { type: 'filter', input: {}, expression: falsyExpression },
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
      expect(output.type).toBe('bindings');
    });

    it('should return an empty stream when the expressions error', async() => {
      const op: any = {
        operation: { type: 'filter', input: {}, expression: erroringExpression },
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
      expect(output.type).toBe('bindings');
    });

    it('Should log warning for an expressionError', async() => {
      // The order is very important. This item requires isExpressionError to still have it's right definition.
      const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
      const op: any = {
        operation: { type: 'filter', input: {}, expression: erroringExpression },
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
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
      const op: any = {
        operation: { type: 'filter', input: {}, expression: erroringExpression },
        context,
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      output.bindingsStream.on('data', () => {
        // This is here to force the stream to start.
      });
      await new Promise<void>(resolve => output.bindingsStream.on('error', () => resolve()));
    });

    it('should use and respect the baseIRI from the expression context', async() => {
      const expression = parse('str(IRI(?a)) = concat("http://example.com/", ?a)');
      const op: any = {
        operation: { type: 'filter', input: {}, expression },
        context: getMockEEActionContext(new ActionContext({ [KeysInitQuery.baseIRI.name]: 'http://example.com' })),
      };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toBe('bindings');
      await expect(output.metadata()).resolves
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    // TODO: was rempoved in busify branch? probably want to relocate when getting 100% coverage
    // eslint-disable-next-line jest/no-commented-out-tests
    // describe('should be able to handle EXIST filters', () => {
    // eslint-disable-next-line jest/no-commented-out-tests
    //   it('like a simple EXIST that is true', async() => {
    //     const resolver = ActorQueryOperation
    //       .createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation, BF);
    //     const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
    //       false,
    //       factory.createBgp([]),
    //     );
    //     const result = resolver(expr, BF.bindings());
    //     await expect(result).resolves.toBe(true);
    //   });
    //
    // eslint-disable-next-line jest/no-commented-out-tests
    //   it('like a simple EXIST that is false', async() => {
    //     const resolver = ActorQueryOperation
    //       .createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation, BF);
    //     mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
    //       bindingsStream: new ArrayIterator([], { autoStart: false }),
    //       metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
    //       operated: arg,
    //       type: 'bindings',
    //       variables: [ DF.variable('a') ],
    //     });
    //     const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
    //       false,
    //       factory.createBgp([]),
    //     );
    //     const result = resolver(expr, BF.bindings());
    //     await expect(result).resolves.toBe(false);
    //   });
    //
    // eslint-disable-next-line jest/no-commented-out-tests
    //   it('like a NOT EXISTS', async() => {
    //     const resolver = ActorQueryOperation
    //       .createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation, BF);
    //     mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
    //       bindingsStream: new ArrayIterator([], { autoStart: false }),
    //       metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
    //       operated: arg,
    //       type: 'bindings',
    //       variables: [ DF.variable('a') ],
    //     });
    //     const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
    //       true,
    //       factory.createBgp([]),
    //     );
    //     const result = resolver(expr, BF.bindings());
    //     await expect(result).resolves.toBe(true);
    //   });
    //
    // eslint-disable-next-line jest/no-commented-out-tests
    //   it('like an EXIST that errors', async() => {
    //     const resolver = ActorQueryOperation
    //       .createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation, BF);
    //     const bindingsStream = new ArrayIterator([{}, {}, {}]).transform({
    //       autoStart: false,
    //       transform(item, done, push) {
    //         push(item);
    //         bindingsStream.emit('error', 'Test error');
    //         done();
    //       },
    //     });
    //     mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
    //       bindingsStream,
    //       metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
    //       operated: arg,
    //       type: 'bindings',
    //       variables: [ DF.variable('a') ],
    //     });
    //     const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
    //       false,
    //       factory.createBgp([]),
    //     );
    //     await expect(resolver(expr, BF.bindings())).rejects.toBeTruthy();
    //   });
    // });
  });
});
