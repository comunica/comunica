import { literal, variable } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { Algebra } from "sparqlalgebrajs";
import * as sparqlee from "sparqlee";
const arrayifyStream = require('arrayify-stream');

import { ActorQueryOperation, Bindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ActorQueryOperationOrderBySparqlee } from "../lib/ActorQueryOperationOrderBySparqlee";

describe('ActorQueryOperationOrderBySparqlee', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('22') }),
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('333') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['?a'],
      }),
    };
  });

  describe('The ActorQueryOperationOrderBySparqlee module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationOrderBySparqlee).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationOrderBySparqlee constructor', () => {
      expect(new (ActorQueryOperationOrderBySparqlee as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationOrderBySparqlee as any);
      expect(new (ActorQueryOperationOrderBySparqlee)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationOrderBySparqlee objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationOrderBySparqlee as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationOrderBySparqlee instance', () => {
    let actor: ActorQueryOperationOrderBySparqlee;
    let orderA: Algebra.TermExpression;
    let orderB: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;
    let orderA1: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: 'expression', expressionType: 'term', term: variable('a') };
      orderB = { type: 'expression', expressionType: 'term', term: variable('b') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [orderA] };
      orderA1 = { args: [orderA], expressionType: 'operator', operator: 'strlen', type: 'expression' };
    });

    it('should test on orderby', () => {
      const op = { operation: { type: 'orderby', expressions: [] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on a descending orderby', () => {
      const op = { operation: { type: 'orderby', expressions: [descOrderA] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on multiple expressions', () => {
      const op = { operation: { type: 'orderby', expressions: [orderA, descOrderA, orderA1] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-orderby', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderA] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('22') }),
        Bindings({ '?a': literal('333') }),
      ]);
    });

    it('should run with a window', async () => {
      actor = new ActorQueryOperationOrderBySparqlee({ name: 'actor', bus, mediatorQueryOperation, window: 1 });
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderA] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('22') }),
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('333') }),
      ]);
    });

    it('should run operator expressions', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderA1] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('22') }),
        Bindings({ '?a': literal('333') }),
      ]);
    });

    it('should run descend', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [descOrderA] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('333') }),
        Bindings({ '?a': literal('22') }),
        Bindings({ '?a': literal('1') }),
      ]);
    });

    it('should ignore undefined results', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderB] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('22') }),
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('333') }),
      ]);
    });

    it('should emit an error on a hard erroring expression', async (next) => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      spyOn(sparqlee, 'isExpressionError').and.returnValue(false);
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderB] } };
      const output = await actor.run(op) as any;
      output.bindingsStream.on('error', () => next());
    });
  });
});
