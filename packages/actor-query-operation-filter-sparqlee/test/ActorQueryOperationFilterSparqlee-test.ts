import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQueryOperationResultBindings, Bindings } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, translate } from 'sparqlalgebrajs';
import * as sparqlee from 'sparqlee';
import { isExpressionError } from 'sparqlee';
import { ActorQueryOperationFilterSparqlee } from '../lib/ActorQueryOperationFilterSparqlee';
import '@comunica/jest';

const DF = new DataFactory();
const BF = new BindingsFactory();

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
          BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]}),
        operated: arg,
        type: 'bindings',
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
      const op: any = { operation: { type: 'filter', expression: truthyExpression }, context: new ActionContext() };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should fail on unsupported operators', () => {
      const op: any = { operation: { type: 'filter', expression: unknownExpression }, context: new ActionContext() };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const op: any = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should return the full stream for a truthy filter', async() => {
      const op: any = { operation: { type: 'filter', input: {}, expression: truthyExpression },
        context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    it('should return an empty stream for a falsy filter', async() => {
      const op: any = { operation: { type: 'filter', input: {}, expression: falsyExpression },
        context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
      expect(output.type).toEqual('bindings');
    });

    it('should return an empty stream when the expressions error', async() => {
      const op: any = { operation: { type: 'filter', input: {}, expression: erroringExpression },
        context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([]);
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
      expect(output.type).toEqual('bindings');
    });

    it('Should log warning for an expressionError', async() => {
      // The order is very important. This item requires isExpressionError to still have it's right definition.
      const logWarnSpy = jest.spyOn(<any> actor, 'logWarn');
      const op: any = { operation: { type: 'filter', input: {}, expression: erroringExpression },
        context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await new Promise<void>(resolve => output.bindingsStream.on('end', resolve));
      expect(logWarnSpy).toHaveBeenCalledTimes(3);
      logWarnSpy.mock.calls.forEach((call, index) => {
        if (index === 0) {
          const dataCB = <() => { error: any; bindings: Bindings }>call[2];
          const { error, bindings } = dataCB();
          expect(isExpressionError(error)).toBeTruthy();
          expect(bindings).toEqual(`{
  "a": "\\"1\\""
}`);
        }
      });
    });

    it('should emit an error for a hard erroring filter', async() => {
      // eslint-disable-next-line no-import-assign
      Object.defineProperty(sparqlee, 'isExpressionError', { writable: true });
      (<any> sparqlee).isExpressionError = jest.fn(() => false);
      const op: any = { operation: { type: 'filter', input: {}, expression: erroringExpression },
        context: new ActionContext() };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await new Promise<void>(resolve => output.bindingsStream.on('error', () => resolve()));
    });

    it('should use and respect the baseIRI from the expression context', async() => {
      const expression = parse('str(IRI(?a)) = concat("http://example.com/", ?a)');
      const context = new ActionContext({
        [KeysInitQuery.baseIRI.name]: 'http://example.com',
      });
      const op: any = { operation: { type: 'filter', input: {}, expression }, context };
      const output: IQueryOperationResultBindings = <any> await actor.run(op);
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([[ DF.variable('a'), DF.literal('1') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('2') ]]),
        BF.bindings([[ DF.variable('a'), DF.literal('3') ]]),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await output.metadata())
        .toMatchObject({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('a') ]});
    });

    describe('should be able to handle EXIST filters', () => {
      it('like a simple EXIST that is true', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation);
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, BF.bindings());
        expect(await result).toBe(true);
      });

      it('like a simple EXIST that is false', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation);
        mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
          operated: arg,
          type: 'bindings',
          variables: [ DF.variable('a') ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        const result = resolver(expr, BF.bindings());
        expect(await result).toBe(false);
      });

      it('like a NOT EXISTS', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation);
        mediatorQueryOperation.mediate = (arg: any) => Promise.resolve({
          bindingsStream: new ArrayIterator([], { autoStart: false }),
          metadata: () => Promise.resolve({ cardinality: 0, canContainUndefs: false }),
          operated: arg,
          type: 'bindings',
          variables: [ DF.variable('a') ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          true,
          factory.createBgp([]),
        );
        const result = resolver(expr, BF.bindings());
        expect(await result).toBe(true);
      });

      it('like an EXIST that errors', async() => {
        const resolver = ActorQueryOperation.createExistenceResolver(new ActionContext(), actor.mediatorQueryOperation);
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
          metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false }),
          operated: arg,
          type: 'bindings',
          variables: [ DF.variable('a') ],
        });
        const expr: Algebra.ExistenceExpression = factory.createExistenceExpression(
          false,
          factory.createBgp([]),
        );
        await expect(resolver(expr, BF.bindings())).rejects.toBeTruthy();
      });
    });
  });
});
