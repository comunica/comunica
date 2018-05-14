// tslint:disable:object-literal-sort-keys
import { ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ArrayIterator } from "asynciterator";
import { literal, namedNode, variable } from "rdf-data-model";
import { ActorQueryOperationExtend } from "../lib/ActorQueryOperationExtend";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationExtend', () => {
  let bus;
  let mediatorQueryOperation;

  const example = {
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
    variable: { value: "l" },
    expression: {
      type: "expression",
      expressionType: "operator",
      operator: "strlen",
      args: [
        {
          type: "expression",
          expressionType: "term",
          term: { termType: 'Variable', value: "s" },
        },
      ],
    },
  };

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ s: literal('1') }),
          Bindings({ s: literal('2') }),
          Bindings({ s: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['s'],
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
      const op = { operation: example };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-extend', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', async () => {
      const op = { operation: example };
      const output: IActorQueryOperationOutputBindings = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ l: literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ l: literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
        Bindings({ l: literal('1', namedNode('http://www.w3.org/2001/XMLSchema#integer')) }),
      ]);
      expect(output.type).toEqual('bindings');
      expect(output.metadata()).toMatchObject(Promise.resolve({ totalItems: 3 }));
      expect(output.variables).toMatchObject(['l']);
    });
  });
});
