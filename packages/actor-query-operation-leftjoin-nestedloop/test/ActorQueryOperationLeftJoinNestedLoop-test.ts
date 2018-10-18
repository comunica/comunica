// tslint:disable:object-literal-sort-keys
import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { literal } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { ActorQueryOperationLeftJoinNestedLoop } from "../lib/ActorQueryOperationLeftJoinNestedLoop";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationLeftJoinNestedLoop', () => {
  let bus;
  let mediatorQueryOperation;
  let left;

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
        term: { termType: 'Variable', value: 'a' },
      },
      {
        type: "expression",
        expressionType: "term",
        term: { termType: 'Variable', value: 'a' },
      },
    ],
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    left = false;
    const bindingStreamLeft = new ArrayIterator([
      Bindings({ a: literal('1') }),
      Bindings({ a: literal('2') }),
      Bindings({ a: literal('3') }),
    ]);
    const bindingStreamRight = new ArrayIterator([
      Bindings({ a: literal('1'), b: literal('1') }),
      Bindings({ a: literal('3'), b: literal('1') }),
      Bindings({ a: literal('3'), b: literal('2') }),
    ]);
    mediatorQueryOperation = {
      mediate: (arg) => {
        left = !left;
        return Promise.resolve({
          bindingsStream: left ? bindingStreamLeft : bindingStreamRight,
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: left ? ['a'] : ['a', 'b'],
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoinNestedLoop module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoinNestedLoop).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoinNestedLoop constructor', () => {
      expect(new (ActorQueryOperationLeftJoinNestedLoop as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLeftJoinNestedLoop);
      expect(new (ActorQueryOperationLeftJoinNestedLoop as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoinNestedLoop objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationLeftJoinNestedLoop as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationLeftJoinNestedLoop instance', () => {
    let actor: ActorQueryOperationLeftJoinNestedLoop;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoinNestedLoop({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on leftjoin', () => {
      const op = { operation: { type: 'leftjoin' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'leftjoin', left: {}, right: {} } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1'), b: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3'), b: literal('1') }),
          Bindings({ a: literal('3'), b: literal('2') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['a', 'b']);
      });
    });

    it('should correctly handle truthy expressions', async () => {
      const expression = truthyExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1'), b: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3'), b: literal('1') }),
          Bindings({ a: literal('3'), b: literal('2') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['a', 'b']);
      });
    });

    it('should correctly handle falsy expressions', async () => {
      const expression = falsyExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['a', 'b']);
      });
    });

    it('should correctly handle erroring expressions', async () => {
      const expression = erroringExpression;
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['a', 'b']);
      });
    });

    it('should emit an error on a hard erroring expression', async (next) => {
      // Mock the expression error test so we can force 'a programming error' and test the branch
      actor.isExpressionError = (error: Error) => false;
      const op = { operation: { type: 'leftjoin', input: {}, expression: erroringExpression } };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      output.bindingsStream.on('error', () => next());
    });
  });
});
