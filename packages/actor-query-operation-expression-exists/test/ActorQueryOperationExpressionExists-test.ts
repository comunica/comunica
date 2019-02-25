// tslint:disable:object-literal-sort-keys

import { literal, namedNode } from '@rdfjs/data-model';
import { ArrayIterator } from 'asynciterator';
import { Algebra } from 'sparqlalgebrajs';

import { Bindings, IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { ActorQueryOperationExpression } from "@comunica/bus-query-operation-expression";
import { Bus } from "@comunica/core";
import { ActorQueryOperationExpressionExists } from "../lib/ActorQueryOperationExpressionExists";

describe('ActorQueryOperationExpressionExists', () => {
  let bus;
  let mediatorQueryOperation;

  const badExists: Algebra.ExistenceExpression = {
    type: "expression",
    expressionType: "existence",
    not: false,
    input: {
      type: 'bgp',
      patterns: [],
    },
  };

  const int = () => namedNode("http://www.w3.org/2001/XMLSchema#integer");
  const simpleOperationOutput = (): IActorQueryOperationOutputBindings => {
    return {
      type: 'bindings',
      variables: ['a'],
      bindingsStream: new ArrayIterator([
        Bindings({ '?a': literal('1', int()) }),
        Bindings({ '?a': literal('2', int()) }),
        Bindings({ '?a': literal('3', int()) }),
      ]),
    };
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {};
  });

  describe('The ActorQueryOperationExpressionExists module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExpressionExists).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExpressionExists constructor', () => {
      expect(new (ActorQueryOperationExpressionExists as any)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationExpressionExists);
      expect(new (ActorQueryOperationExpressionExists as any)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationExpression);
    });

    it('should not be able to create new ActorQueryOperationExpressionExists objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationExpressionExists as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExpressionExists instance', () => {
    let actor: ActorQueryOperationExpressionExists;

    beforeEach(() => {
      actor = new ActorQueryOperationExpressionExists({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test', () => {
      const action = { expression: badExists, operationOutputBindings: simpleOperationOutput() };
      return expect(actor.test(action)).resolves.toEqual(true); // TODO
    });

    it('should run', () => {
      const action = { expression: badExists, operationOutputBindings: simpleOperationOutput() };
      return expect(actor.run(action)).resolves.toMatchObject({ result: true }); // TODO
    });
  });
});
