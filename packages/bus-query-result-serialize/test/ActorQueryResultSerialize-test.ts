import { Bus } from '@comunica/core';
import { ActorQueryResultSerialize } from '..';

describe('ActorQueryResultSerialize', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryResultSerialize module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerialize).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerialize constructor', () => {
      expect(new (<any> ActorQueryResultSerialize)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerialize);
    });

    it('should not be able to create new ActorQueryResultSerialize objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerialize)(); }).toThrow();
    });
  });
});
