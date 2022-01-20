import { Bus } from '@comunica/core';
import { ActorQueryResultSerializeFixedMediaTypes } from '..';

describe('ActorQueryResultSerializeFixedMediaTypes', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryResultSerializeFixedMediaTypes module', () => {
    it('should be a function', () => {
      expect(ActorQueryResultSerializeFixedMediaTypes).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryResultSerializeFixedMediaTypes constructor', () => {
      expect(new (<any> ActorQueryResultSerializeFixedMediaTypes)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryResultSerializeFixedMediaTypes);
    });

    it('should not be able to create new ActorQueryResultSerializeFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryResultSerializeFixedMediaTypes)(); }).toThrow();
    });
  });

  describe('An ActorQueryResultSerializeFixedMediaTypes instance', () => {
    const actor = new (<any> ActorQueryResultSerializeFixedMediaTypes)({ name: 'actor', bus });

    it('should have a default testHandleChecked implementation', () => {
      return expect(actor.testHandleChecked(null)).resolves.toBeTruthy();
    });
  });
});
