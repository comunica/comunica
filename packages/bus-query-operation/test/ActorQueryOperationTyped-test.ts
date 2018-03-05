import {Bus} from "@comunica/core";
import {ActorQueryOperationTyped} from "../lib/ActorQueryOperationTyped";

describe('ActorQueryOperationTyped', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryOperationTyped module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationTyped).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationTyped constructor', () => {
      expect(new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, 'bla'))
        .toBeInstanceOf(ActorQueryOperationTyped);
    });

    it('should not be able to create new ActorQueryOperationTyped objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationTyped)(); }).toThrow();
    });

    it('should not be able to create new ActorQueryOperationTyped objects without an operation name', () => {
      expect(() => { new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, null); }).toThrow();
    });
  });

  describe('An ActorQueryOperationTyped instance', () => {
    const actor = new (<any> ActorQueryOperationTyped)({ name: 'actor', bus }, 'op');
    actor.testOperation = () => Promise.resolve(true);
    actor.runOperation = () => Promise.resolve(true);

    it('should not test without operation', () => {
      return expect(actor.test({})).rejects.toBeTruthy();
    });

    it('should not test with an invalid operation', () => {
      return expect(actor.test({ operation: { type: 'other-op' } })).rejects.toBeTruthy();
    });

    it('should test with a valid operation', () => {
      return expect(actor.test({ operation: { type: 'op' } })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run({ operation: { type: 'op' } })).resolves.toBeTruthy();
    });
  });
});
