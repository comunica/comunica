import {ActorQueryOperation} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ActorQueryOperationBgpSingle} from "../lib/ActorQueryOperationBgpSingle";

describe('ActorQueryOperationBgpSingle', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({ operated: arg }),
    };
  });

  describe('The ActorQueryOperationBgpSingle module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpSingle).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpSingle constructor', () => {
      expect(new (<any> ActorQueryOperationBgpSingle)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationBgpSingle);
      expect(new (<any> ActorQueryOperationBgpSingle)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpSingle objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpSingle)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationBgpSingle instance', () => {
    let actor: ActorQueryOperationBgpSingle;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpSingle({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should not test on empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: [] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should test on BGPs with a single pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on BGPs with more than one pattern', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc', 'def' ] } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run with a context and delegate the pattern to the mediator', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] }, context: { c: 'C' } };
      return actor.run(op).then(async (output) => {
        expect(output).toMatchObject({ operated: { operation: 'abc', context: { c: 'C' } } });
      });
    });

    it('should run without a context and delegate the pattern to the mediator', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ] } };
      return actor.run(op).then(async (output) => {
        expect(output).toMatchObject({ operated: { operation: 'abc' } });
      });
    });
  });
});
