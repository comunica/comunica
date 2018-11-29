// tslint:disable:object-literal-sort-keys
import { literal, namedNode } from '@rdfjs/data-model';
import { ArrayIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings } from '@comunica/bus-query-operation';
import { ActorQueryOperationExpression } from "@comunica/bus-query-operation-expression";
import { Bus } from "@comunica/core";
import { ActorQueryOperationExpressionAggregate } from "../lib/ActorQueryOperationExpressionAggregate";

describe('ActorQueryOperationExpressionAggregate', () => {
  let bus;

  const simpleCount: Algebra.AggregateExpression = {
    type: "expression",
    expressionType: "aggregate",
    aggregator: "count",
    expression: {
      type: "expression",
      expressionType: "term",
      term: {
        termType: "Variable",
        value: "a",
      },
    },
    distinct: false,
    variable: {
      termType: "Variable",
      value: "var0",
    },
  };

  const int = () => namedNode("http://www.w3.org/2001/XMLSchema#integer");
  const simpleBindingsStream = () => {
    return new ArrayIterator([
      Bindings({ '?a': literal('1', int()) }),
      Bindings({ '?a': literal('2', int()) }),
      Bindings({ '?a': literal('3', int()) }),
    ]);
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationExpressionAggregate module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExpressionAggregate).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExpressionAggregate constructor', () => {
      expect(new (ActorQueryOperationExpressionAggregate as any)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationExpressionAggregate);
      expect(new (ActorQueryOperationExpressionAggregate as any)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationExpression);
    });

    it('should not be able to create new ActorQueryOperationExpressionAggregate objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationExpressionAggregate as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExpressionAggregate instance', () => {
    let actor: ActorQueryOperationExpressionAggregate;

    beforeEach(() => {
      actor = new ActorQueryOperationExpressionAggregate({ name: 'actor', bus });
    });

    it('should test', () => {
      const action = { expression: simpleCount, bindingsStream: simpleBindingsStream() };
      return expect(actor.test(action)).resolves.toEqual(true);
    });

    it('should run', () => {
      const action = { expression: simpleCount, bindingsStream: simpleBindingsStream() };
      return expect(actor.run(action)).resolves
        .toMatchObject({ result: literal("3", int()) });
    });
  });
});
