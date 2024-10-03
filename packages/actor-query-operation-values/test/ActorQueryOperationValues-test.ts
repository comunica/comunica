import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getSafeBindings } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { ActorQueryOperationValues } from '../lib/ActorQueryOperationValues';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorQueryOperationValues', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationValues module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationValues).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationValues constructor', () => {
      expect(new (<any> ActorQueryOperationValues)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationValues);
      expect(new (<any> ActorQueryOperationValues)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationValues objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperationValues)();
      }).toThrow(`Class constructor ActorQueryOperationValues cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQueryOperationValues instance', () => {
    let actor: ActorQueryOperationValues;

    beforeEach(() => {
      actor = new ActorQueryOperationValues({ name: 'actor', bus, mediatorMergeBindingsContext });
    });

    it('should test on values', async() => {
      const op: any = {
        operation: { type: 'values' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toPassTestVoid();
    });

    it('should not test on non-values', async() => {
      const op: any = {
        operation: { type: 'some-other-type' },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      await expect(actor.test(op)).resolves.toFailTest(`Actor actor only supports values operations, but got some-other-type`);
    });

    it('should run on a 1 variable and 1 value', async() => {
      const variables = [ DF.variable('v') ];
      const bindings = [{ '?v': DF.namedNode('v1') }];
      const op: any = {
        operation: { type: 'values', variables, bindings },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 1 },
        variables: [
          { variable: DF.variable('v'), canBeUndef: false },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v1') ],
        ]),
      ]);
    });

    it('should run on a 1 variable and 2 values', async() => {
      const variables = [ DF.variable('v') ];
      const bindings = [{ '?v': DF.namedNode('v1') }, { '?v': DF.namedNode('v2') }];
      const op: any = {
        operation: { type: 'values', variables, bindings },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 2 },
        variables: [
          { variable: DF.variable('v'), canBeUndef: false },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v2') ],
        ]),
      ]);
    });

    it('should run on a 2 variables and 2 values', async() => {
      const variables = [ DF.variable('v'), DF.variable('w') ];
      const bindings = [
        { '?v': DF.namedNode('v1'), '?w': DF.namedNode('w1') },
        { '?v': DF.namedNode('v2'), '?w': DF.namedNode('w2') },
      ];
      const op: any = {
        operation: { type: 'values', variables, bindings },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 2 },
        variables: [
          { variable: DF.variable('v'), canBeUndef: false },
          { variable: DF.variable('w'), canBeUndef: false },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v1') ],
          [ DF.variable('w'), DF.namedNode('w1') ],
        ]),
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v2') ],
          [ DF.variable('w'), DF.namedNode('w2') ],
        ]),
      ]);
    });

    it('should run on a 2 variables and 2 values, one undefined', async() => {
      const variables = [ DF.variable('v'), DF.variable('w') ];
      const bindings = [
        { '?v': DF.namedNode('v1') },
        { '?v': DF.namedNode('v2'), '?w': DF.namedNode('w2') },
      ];
      const op: any = {
        operation: { type: 'values', variables, bindings },
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const output = getSafeBindings(await actor.run(op, undefined));
      await expect(output.metadata()).resolves.toMatchObject({
        cardinality: { type: 'exact', value: 2 },
        variables: [
          { variable: DF.variable('v'), canBeUndef: false },
          { variable: DF.variable('w'), canBeUndef: true },
        ],
      });
      expect(output.type).toBe('bindings');
      await expect(output.bindingsStream).toEqualBindingsStream([
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v1') ],
        ]),
        BF.bindings([
          [ DF.variable('v'), DF.namedNode('v2') ],
          [ DF.variable('w'), DF.namedNode('w2') ],
        ]),
      ]);
    });
  });
});
