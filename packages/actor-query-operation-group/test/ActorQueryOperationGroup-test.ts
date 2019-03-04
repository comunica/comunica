// tslint:disable:object-literal-sort-keys
import { literal, variable } from "@rdfjs/data-model";
import { ArrayIterator } from "asynciterator";
import { Variable } from "rdf-js";
import { Algebra } from 'sparqlalgebrajs';
const arrayifyStream = require('arrayify-stream');

import { ActorQueryOperation, Bindings, IActionQueryOperation } from "@comunica/bus-query-operation";
import { Bus } from "@comunica/core";
import { ActorQueryOperationGroup } from "../lib/ActorQueryOperationGroup";

const simpleXYZinput = {
  type: "bgp",
  patterns: [
    {
      subject: {
        value: "x",
      },
      predicate: {
        value: "y",
      },
      object: {
        value: "z",
      },
      graph: {
        value: "",
      },
      type: "pattern",
    },
  ],
};

const getDefaultMediatorQueryOperation = () => ({
  mediate: (arg) => Promise.resolve({
    bindingsStream: new ArrayIterator([
      Bindings({ a: literal('1') }),
      Bindings({ a: literal('2') }),
      Bindings({ a: literal('3') }),
    ]),
    metadata: () => Promise.resolve({ totalItems: 3 }),
    operated: arg,
    type: 'bindings',
    variables: ['a'],
  }),
});

interface ICaseOptions {
  inputBindings?: Bindings[];
  groupVariables?: string[];
  inputVariables?: string[];
  aggregates?: Algebra.BoundAggregate[];
  inputOp?: any;
}
interface ICaseOutput {
  actor: ActorQueryOperationGroup; bus: any; mediatorQueryOperation: any; op: IActionQueryOperation;
}

function int(value: string) {
  return literal(value, "http://www.w3.org/2001/XMLSchema#integer");
}

function constructCase(
  { inputBindings, inputVariables = [], groupVariables = [], aggregates = [], inputOp }: ICaseOptions)
  : ICaseOutput {
  const bus: any = new Bus({ name: 'bus' });

  // Construct mediator
  let mediatorQueryOperation: any;
  if (!inputBindings) {
    mediatorQueryOperation = getDefaultMediatorQueryOperation();
  } else {
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator(inputBindings),
        metadata: () => Promise.resolve({ totalItems: inputBindings.length }),
        operated: arg,
        type: 'bindings',
        variables: inputVariables,
      }),
    };
  }

  const operation: Algebra.Group = {
    type: 'group',
    input: inputOp,
    variables: groupVariables.map(variable),
    aggregates,
  };
  const op = { operation };

  const actor = new ActorQueryOperationGroup({ name: 'actor', bus, mediatorQueryOperation });
  return { actor, bus, mediatorQueryOperation, op };
}

describe('ActorQueryOperationGroup', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = getDefaultMediatorQueryOperation();
  });

  describe('The ActorQueryOperationGroup module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationGroup).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationGroup constructor', () => {
      expect(new (ActorQueryOperationGroup as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationGroup);
      expect(new (ActorQueryOperationGroup as any)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationGroup objects without \'new\'', () => {
      expect(() => { (ActorQueryOperationGroup as any)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationGroup instance', () => {
    it('should test on group', () => {
      const op = { operation: { type: 'group' } };
      const { actor } = constructCase({});
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-group', () => {
      const op = { operation: { type: 'some-other-type' } };
      const { actor } = constructCase({});
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should group on a single var', async () => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa') }),
          Bindings({ '?x': literal('aaa') }),
          Bindings({ '?x': literal('bbb') }),
          Bindings({ '?x': literal('ccc') }),
          Bindings({ '?x': literal('aaa') }),
        ],
        groupVariables: ['x'],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': literal('aaa') }),
        Bindings({ '?x': literal('bbb') }),
        Bindings({ '?x': literal('ccc') }),
      ]);
      expect(output.variables).toMatchObject(['?x']);
    });

    it('should group on multiple vars', async () => {
      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('bbb') }),
          Bindings({ '?x': literal('bbb'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('ccc'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
        ],
        groupVariables: ['x', 'y'],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
        Bindings({ '?x': literal('aaa'), '?y': literal('bbb') }),
        Bindings({ '?x': literal('bbb'), '?y': literal('aaa') }),
        Bindings({ '?x': literal('ccc'), '?y': literal('aaa') }),
      ]);
      expect(output.variables).toMatchObject(['?x', '?y']);
    });

    it('should aggregate single vars', async () => {
      const countY: Algebra.BoundAggregate = {
        type: "expression",
        expressionType: "aggregate",
        aggregator: "count",
        expression: {
          type: "expression",
          expressionType: "term",
          term: variable('y'),
        },
        distinct: false,
        variable: variable('count'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('bbb') }),
          Bindings({ '?x': literal('bbb'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('ccc'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
        ],
        groupVariables: ['x'],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [countY],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': literal('aaa'), '?count': int('3') }),
        Bindings({ '?x': literal('bbb'), '?count': int('1') }),
        Bindings({ '?x': literal('ccc'), '?count': int('1') }),
      ]);
      expect(output.variables).toMatchObject(['?x', '?count']);
    });

    it('should aggregate multiple vars', async () => {
      const countY: Algebra.BoundAggregate = {
        type: "expression",
        expressionType: "aggregate",
        aggregator: "count",
        expression: {
          type: "expression",
          expressionType: "term",
          term: variable('y'),
        },
        distinct: false,
        variable: variable('count'),
      };

      const sumZ: Algebra.BoundAggregate = {
        type: "expression",
        expressionType: "aggregate",
        aggregator: "sum",
        expression: {
          type: "expression",
          expressionType: "term",
          term: variable('z'),
        },
        distinct: false,
        variable: variable('sum'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa'), '?z': int("1") }),
          Bindings({ '?x': literal('aaa'), '?y': literal('bbb'), '?z': int("2") }),
          Bindings({ '?x': literal('bbb'), '?y': literal('aaa'), '?z': int("3") }),
          Bindings({ '?x': literal('ccc'), '?y': literal('aaa'), '?z': int("4") }),
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa'), '?z': int("5") }),
        ],
        groupVariables: ['x'],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [countY, sumZ],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': literal('aaa'), '?count': int('3'), '?sum': int('8') }),
        Bindings({ '?x': literal('bbb'), '?count': int('1'), '?sum': int('3') }),
        Bindings({ '?x': literal('ccc'), '?count': int('1'), '?sum': int('4') }),
      ]);
      expect(output.variables).toMatchObject(['?x', '?count', '?sum']);
    });

    it('should aggregate implicit', async () => {
      const countY: Algebra.BoundAggregate = {
        type: "expression",
        expressionType: "aggregate",
        aggregator: "count",
        expression: {
          type: "expression",
          expressionType: "term",
          term: variable('y'),
        },
        distinct: false,
        variable: variable('count'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('bbb') }),
          Bindings({ '?x': literal('bbb'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('ccc'), '?y': literal('aaa') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('aaa') }),
        ],
        groupVariables: [],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [countY],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?count': int('5') }),
      ]);
      expect(output.variables).toMatchObject(['?count']);
    });

    // https://www.w3.org/TR/sparql11-query/#aggregateExample2
    it('should handle aggregate errors', async () => {
      const sumY: Algebra.BoundAggregate = {
        type: "expression",
        expressionType: "aggregate",
        aggregator: "sum",
        expression: {
          type: "expression",
          expressionType: "term",
          term: variable('y'),
        },
        distinct: false,
        variable: variable('sum'),
      };

      const { op, actor } = constructCase({
        inputBindings: [
          Bindings({ '?x': literal('aaa'), '?y': int('1') }),
          Bindings({ '?x': literal('aaa'), '?y': int('1') }),
          Bindings({ '?x': literal('bbb'), '?y': literal('not an int') }),
          Bindings({ '?x': literal('ccc'), '?y': int('1') }),
          Bindings({ '?x': literal('aaa'), '?y': literal('not an int') }),
        ],
        groupVariables: ['x'],
        inputVariables: ['x', 'y', 'z'],
        inputOp: simpleXYZinput,
        aggregates: [sumY],
      });

      const output = await actor.run(op) as any;
      expect(await arrayifyStream(output.bindingsStream)).toMatchObject([
        Bindings({ '?x': literal('aaa'), '?sum': undefined }),
        Bindings({ '?x': literal('bbb'), '?sum': undefined }),
        Bindings({ '?x': literal('ccc'), '?sum': int('1') }),
      ]);
      expect(output.variables).toMatchObject(['?x', '?sum']);
    });

    it.skip('should respect distinct', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to count', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to sum', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to min', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to max', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to avg', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to sample', async () => {
      expect(1).toMatchObject(0);
    });

    it.skip('should be able to groupConcat', async () => {
      expect(1).toMatchObject(0);
    });
  });
});
