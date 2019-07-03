import { Actor } from '@comunica/core';
// tslint:disable:object-literal-sort-keys
import { Bus } from "@comunica/core";
import { literal, namedNode } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
const arrayifyStream = require('arrayify-stream');
import * as sparqlee from 'sparqlee';

import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { ActorQueryOperationExtend } from "../lib/ActorQueryOperationExtend";

describe('ActorQueryOperationExtend', () => {
  let bus;
  let mediatorQueryOperation;

  const example = (expression) => ({
    type: 'extend',
    input: {
      type: "bgp",
      patterns: [{
        subject: { value: "s" },
        predicate: { value: "p" },
        object: { value: "o" },
        graph: { value: "" },
        type: "pattern",
      }],
    },
    variable: { termType: 'Variable', value: "l" },
    expression,
  });

  const defaultExpression = {
    type: "expression",
    expressionType: "operator",
    operator: "strlen",
    args: [
      {
        type: "expression",
        expressionType: "term",
        term: { termType: 'Variable', value: 'a' },
      },
    ],
  };

  // We sum 2 strings, which should error
  const faultyExpression = {
    type: "expression",
    expressionType: "operator",
    operator: "+",
    args: [
      {
        type: "expression",
        expressionType: "term",
        term: { termType: 'Variable', value: 'a' },
      },
      {
        type: "expression",
        expressionType: "term",
        term: { termType: 'Variable', value: 'a' },
      },
    ],
  };

  const input = [
    Bindings({ '?a': literal('1') }),
    Bindings({ '?a': literal('2') }),
    Bindings({ '?a': literal('3') }),
  ];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator(input),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['?a'],
      }),
    };
  });

  describe('The ActorQueryOperationExtend module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExtend).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExtend constructor', () => {
      expect(new (ActorQueryOperationExtend as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationExtend);
      expect(new (ActorQueryOperationExtend as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationExtend objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationExtend as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExtend instance', () => {
    let actor: ActorQueryOperationExtend;

    beforeEach(() => {
      actor = new ActorQueryOperationExtend({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on extend', () => {
      const op = { operation: example(defaultExpression) };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async () => {
      const op = { operation: example(defaultExpression) };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({
          '?a': literal('1'),
          '?l': literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
        Bindings({
          '?a': literal('2'),
          '?l': literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
        Bindings({
          '?a': literal('3'),
          '?l': literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')),
        }),
      ]);

      expect(output.type).toEqual('bindings');
      expect(await output.metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject(['?a', '?l']);
    });

    it('should not extend bindings on erroring expressions', async () => {
      const warn = jest.fn();
      spyOn(Actor, "getContextLogger").and.returnValue({ warn });

      const op = { operation: example(faultyExpression) };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;

      expect(await arrayifyStream(output.bindingsStream)).toMatchObject(input);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(output.type).toEqual('bindings');
      expect(await output.metadata()).toMatchObject({ totalItems: 3 });
      expect(output.variables).toMatchObject(['?a', '?l']);
    });

    it('should emit error when evaluation code returns a hard error', async (next) => {
      const warn = jest.fn();
      spyOn(Actor, "getContextLogger").and.returnValue({ warn });
      spyOn(sparqlee, 'isExpressionError').and.returnValue(false);

      const op = { operation: example(faultyExpression) };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      output.bindingsStream.on('error', () => next());
      expect(warn).toBeCalledTimes(0);
    });

  });
});
