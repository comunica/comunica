import { BindingsFactory } from '@comunica/bindings-factory';
import { Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import { ActorQueryOperation } from '..';

const BF = new BindingsFactory();

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
      expect(() => ActorQueryOperation.getSafeBindings(<any>{ type: 'bindings' })).not.toThrow();
    });

    it('should error for non-bindings', () => {
      expect(() => ActorQueryOperation.getSafeBindings(<any>{ type: 'no-bindings' })).toThrow();
    });
  });

  describe('#getSafeQuads', () => {
    it('should return for quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads(<any>{ type: 'quads' })).not.toThrow();
    });

    it('should error for non-quads', () => {
      expect(() => ActorQueryOperation.getSafeQuads(<any>{ type: 'no-quads' })).toThrow();
    });
  });

  describe('#getSafeBoolean', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean(<any>{ type: 'boolean' })).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.getSafeBoolean(<any>{ type: 'no-boolean' })).toThrow();
    });
  });

  describe('#cachifyMetadata', () => {
    it('should remember an instance', async() => {
      let counter = 0;
      const cb = jest.fn(async() => ({ state: new MetadataValidationState(), value: counter++ }));
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect((await cached()).value).toEqual(0);
      expect((await cached()).value).toEqual(0);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should handle invalidation', async() => {
      let counter = 0;
      const state = new MetadataValidationState();
      const cb = jest.fn(async() => ({ state, value: counter++ }));
      const cached = ActorQueryOperation.cachifyMetadata(<any> cb);
      expect((await cached()).value).toEqual(0);
      expect((await cached()).value).toEqual(0);
      expect(cb).toHaveBeenCalledTimes(1);

      state.invalidate();
      expect((await cached()).value).toEqual(1);
      expect((await cached()).value).toEqual(1);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('#validateQueryOutput', () => {
    it('should return for boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput(<any>{ type: 'boolean' }, 'boolean')).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => ActorQueryOperation.validateQueryOutput(<any>{ type: 'no-boolean' }, 'boolean')).toThrow();
    });
  });
});
