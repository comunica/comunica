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
  });
});
