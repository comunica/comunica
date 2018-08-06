import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ActorQueryOperationBgpEmpty} from "../lib/ActorQueryOperationBgpEmpty";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationBgpEmpty', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationBgpEmpty module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpEmpty).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpEmpty constructor', () => {
      expect(new (<any> ActorQueryOperationBgpEmpty)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationBgpEmpty);
      expect(new (<any> ActorQueryOperationBgpEmpty)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpEmpty objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpEmpty)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationBgpEmpty instance', () => {
    let actor: ActorQueryOperationBgpEmpty;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpEmpty({ name: 'actor', bus });
    });

    it('should test on empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: [] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run', () => {
      const op = { operation: { type: 'bgp', patterns: [] } };
      return actor.run(op).then(async (output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([Bindings({})]);
        expect(output.variables).toEqual([]);
        expect(await output.metadata()).toMatchObject({ totalItems: 1 });
      });
    });
  });
});
