import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode, variable} from "@rdfjs/data-model";
import {ActorQueryOperationValues} from "../lib/ActorQueryOperationValues";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationValues', () => {
  let bus;

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
      expect(() => { (<any> ActorQueryOperationValues)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationValues instance', () => {
    let actor: ActorQueryOperationValues;

    beforeEach(() => {
      actor = new ActorQueryOperationValues({ name: 'actor', bus });
    });

    it('should test on values', () => {
      const op = { operation: { type: 'values' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-values', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on a 1 variable and 1 value', () => {
      const variables = [variable('v')];
      const bindings = [{ '?v': namedNode('v1') }];
      const op = { operation: { type: 'values', variables, bindings } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 1 });
        expect(output.variables).toEqual([ '?v' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?v': namedNode('v1') }),
        ]);
      });
    });

    it('should run on a 1 variable and 2 values', () => {
      const variables = [variable('v')];
      const bindings = [{ '?v': namedNode('v1') }, { '?v': namedNode('v2') }];
      const op = { operation: { type: 'values', variables, bindings } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.variables).toEqual([ '?v' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?v': namedNode('v1') }),
          Bindings({ '?v': namedNode('v2') }),
        ]);
      });
    });

    it('should run on a 2 variables and 2 values', () => {
      const variables = [variable('v'), variable('w')];
      const bindings = [
        { '?v': namedNode('v1'), '?w': namedNode('w1') },
        { '?v': namedNode('v2'), '?w': namedNode('w2') },
      ];
      const op = { operation: { type: 'values', variables, bindings } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await output.metadata()).toEqual({ totalItems: 2 });
        expect(output.variables).toEqual([ '?v', '?w' ]);
        expect(output.type).toEqual('bindings');
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({ '?v': namedNode('v1'), '?w': namedNode('w1') }),
          Bindings({ '?v': namedNode('v2'), '?w': namedNode('w2') }),
        ]);
      });
    });
  });
});
