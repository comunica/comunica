// tslint:disable:object-literal-sort-keys
import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ArrayIterator } from "asynciterator";
import { literal, variable } from "rdf-data-model";
import { ActorQueryOperationLeftJoinNestedLoop } from "../lib/ActorQueryOperationLeftJoinNestedLoop";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationLeftJoinNestedLoop', () => {
  let bus;
  let mediatorQueryOperation;
  let left;
  let bindingStreamLeft;
  let bindingStreamRight;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    left = false;
    bindingStreamLeft = new ArrayIterator([
      Bindings({ '?a': literal('1') }),
      Bindings({ '?a': literal('2') }),
      Bindings({ '?a': literal('3') }),
    ]);
    bindingStreamRight = new ArrayIterator([
      Bindings({ '?a': literal('1'), '?b': literal('1') }),
      Bindings({ '?a': literal('3'), '?b': literal('1') }),
      Bindings({ '?a': literal('3'), '?b': literal('2') }),
    ]);
    mediatorQueryOperation = {
      mediate: (arg) => {
        left = !left;
        return Promise.resolve({
          bindingsStream: left ? bindingStreamLeft : bindingStreamRight,
          metadata: () => Promise.resolve({ totalItems: 3 }),
          operated: arg,
          type: 'bindings',
          variables: left ? ['?a'] : ['?a', '?b'],
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoinNestedLoop module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoinNestedLoop).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoiNestedLoop constructor', () => {
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
          Bindings({ '?a': literal('1'), '?b': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3'), '?b': literal('1') }),
          Bindings({ '?a': literal('3'), '?b': literal('2') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['?a', '?b']);
      });
    });

    it('should bind when expression evaluates true', () => {
      const expression = {
        type: "expression",
        expressionType: "operator",
        operator: "strlen",
        args: [
          {
            type: "expression",
            expressionType: "term",
            term: { termType: 'Variable', value: 'b' },
          },
        ],
      };
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('1'), '?b': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3'), '?b': literal('1') }),
          Bindings({ '?a': literal('3'), '?b': literal('2') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 4 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['?a', '?b']);
      });
    });

    it('should not bind when expression errors evaluates', () => {
      const expression = {
        type: "expression",
        expressionType: "operator",
        operator: "abs",
        args: [
          {
            type: "expression",
            expressionType: "term",
            term: { termType: 'Variable', value: 's' },
          },
        ],
      };
      const op = { operation: { type: 'leftjoin', left: {}, right: {}, expression } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?a': literal('1') }),
          Bindings({ '?a': literal('2') }),
          Bindings({ '?a': literal('3') }),
        ]);
        expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
        expect(output.type).toEqual('bindings');
        expect(output.variables).toMatchObject(['?a', '?b']);
      });
    });
  });
});
