import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {literal, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Algebra} from "sparqlalgebrajs";
import {ActorQueryOperationOrderByDirect} from "../lib/ActorQueryOperationOrderByDirect";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationOrderByDirect', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['?a'],
      }),
    };
  });

  describe('The ActorQueryOperationOrderByDirect module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationOrderByDirect).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationOrderByDirect constructor', () => {
      expect(new (<any> ActorQueryOperationOrderByDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationOrderByDirect);
      expect(new (<any> ActorQueryOperationOrderByDirect)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationOrderByDirect objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationOrderByDirect)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationOrderByDirect instance', () => {
    let actor: ActorQueryOperationOrderByDirect;
    let orderA: Algebra.TermExpression;
    let orderB: Algebra.TermExpression;
    let descOrderA: Algebra.OperatorExpression;
    let orderA1: Algebra.OperatorExpression;

    beforeEach(() => {
      actor = new ActorQueryOperationOrderByDirect({ name: 'actor', bus, mediatorQueryOperation });
      orderA = { type: 'expression', expressionType: 'term', term: variable('a') };
      orderB = { type: 'expression', expressionType: 'term', term: variable('b') };
      descOrderA = { type: 'expression', expressionType: 'operator', operator: 'desc', args: [orderA] };
      orderA1 = { args: [orderA, { type: 'expression', expressionType: 'term', term: literal('1') }],
        expressionType: 'operator', operator: '+', type: 'expression' };
    });

    it('should test on orderby', () => {
      const op = { operation: { type: 'orderby', expressions: [] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on a descending orderby', () => {
      const op = { operation: { type: 'orderby', expressions: [ descOrderA ] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test on multiple expressions', () => {
      const op = { operation: { type: 'orderby', expressions: [ orderA, descOrderA, orderA1 ] } };
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
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('3') }),
      ]);
    });

    it('should run with a window', async () => {
      actor = new ActorQueryOperationOrderByDirect({ name: 'actor', bus, mediatorQueryOperation, window: 1 });
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderA] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('3') }),
      ]);
    });

    it('should run operator expressions', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderA1] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('3') }),
      ]);
    });

    it('should run descend', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [descOrderA] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('3') }),
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('1') }),
      ]);
    });

    it('should ignore undefined results', async () => {
      const op = { operation: { type: 'orderby', input: {}, expressions: [orderB] } };
      const output = await actor.run(op);
      const array = await arrayifyStream(ActorQueryOperation.getSafeBindings(output).bindingsStream);
      expect(array).toMatchObject([
        Bindings({ '?a': literal('2') }),
        Bindings({ '?a': literal('1') }),
        Bindings({ '?a': literal('3') }),
      ]);
    });
  });
});
