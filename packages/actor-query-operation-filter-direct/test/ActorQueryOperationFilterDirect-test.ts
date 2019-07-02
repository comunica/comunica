import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { literal } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { ActorQueryOperationFilterDirect } from "../lib/ActorQueryOperationFilterDirect";
import { SparqlExpressionEvaluator } from "../lib/SparqlExpressionEvaluator";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationFilterDirect', () => {
  let bus;
  let mediatorQueryOperation;
  const truthyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'true' },
    type: 'expression',
  };
  const falsyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'false' },
    type: 'expression',
  };
  const unknownExpression = {
    args: [],
    expressionType: 'term',
    operator: 'DUMMY',
    type: 'operator',
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

  describe('The ActorQueryOperationFilterDirect module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterDirect).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterDirect constructor', () => {
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterDirect);
      expect(new (<any> ActorQueryOperationFilterDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterDirect objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFilterDirect)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationFilterDirect instance', () => {
    let actor: ActorQueryOperationFilterDirect;

    beforeEach(() => {
      actor = new ActorQueryOperationFilterDirect({ name: 'actor', bus, mediatorQueryOperation });
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
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('3') }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(await output.metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject(['a']);
    });

    it('should return an empty stream for a falsy filter', async () => {
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression } };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([]);
      expect(await output.metadata()).toMatchObject({ totalItems: 3 });
      expect(output.type).toEqual('bindings');
      expect(output.variables).toMatchObject(['a']);
    });

    it('should emit an error for an erroring filter', async () => {
      SparqlExpressionEvaluator.createEvaluator = () => () => { throw new Error('error'); };
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression } };
      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      return expect(arrayifyStream(output.bindingsStream)).rejects.toBeTruthy();
    });
  });
});
