import { Bus } from '@comunica/core';
import { ActorQueryOperation } from '..';

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
      expect(() => {
        (<any> ActorQueryOperation)();
      }).toThrow(`Class constructor ActorQueryOperation cannot be invoked without 'new'`);
    });
  });
});
