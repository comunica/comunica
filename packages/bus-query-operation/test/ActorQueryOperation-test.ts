import {Bus} from "@comunica/core";
import {ActorQueryOperation} from "../lib/ActorQueryOperation";

describe('ActorQueryOperation', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryOperation module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperation).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperation constructor', () => {
      expect(new (<any> ActorQueryOperation)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperation objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperation)(); }).toThrow();
    });
  });

  describe('#getSafeBindings', () => {
    it('should return for bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings({ type: 'bindings' })).not.toThrow();
    });

    it('should error for non-bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings({ type: 'no-bindings' })).toThrow();
    });
  });

  describe('#getSafeQuads', () => {
    it('should return for quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads({ type: 'quads' })).not.toThrow();
    });

    it('should error for non-quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads({ type: 'no-quads' })).toThrow();
    });
  });

  describe('#getSafeBoolean', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean({ type: 'boolean' })).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean({ type: 'no-boolean' })).toThrow();
    });
  });

  describe('#cachifyMetadata', () => {
    it('should remember an instance', () => {
      const cb = jest.fn(() => 'ABC');
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect(cached()).toEqual('ABC');
      expect(cached()).toEqual('ABC');
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  describe('#validateQueryOutput', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput({ type: 'boolean' }, 'boolean')).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput({ type: 'no-boolean' }, 'boolean')).toThrow();
    });
  });
});
