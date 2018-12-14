// tslint:disable:object-literal-sort-keys
import { literal, variable } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import * as sparqlee from "sparqlee";
const arrayifyStream = require('arrayify-stream');

import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ActorQueryOperationFilterSparqlee } from "../lib/ActorQueryOperationFilterSparqlee";

describe('ActorQueryOperationFilterSparqlee', () => {
  let bus;
  let mediatorQueryOperation;
  const truthyExpression = {
    expressionType: 'term',
    term: literal("nonemptystring"),
    type: 'expression',
  };
  const falsyExpression = {
    expressionType: 'term',
    term: literal(""),
    type: 'expression',
  };
  const erroringExpression = {
    type: "expression",
    expressionType: "operator",
    operator: "+",
    args: [
      {
        type: "expression",
        expressionType: "term",
        term: variable('a'),
      },
      {
        type: "expression",
        expressionType: "term",
        term: variable('a'),
      },
    ],
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

    beforeEach(() => {
      actor = new ActorQueryOperationFilterSparqlee({ name: 'actor', bus, mediatorQueryOperation });
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
  });
});
