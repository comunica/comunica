import {Bus} from "@comunica/core";
import {ActorRdfSerializeFixedMediaTypes} from "../lib/ActorRdfSerializeFixedMediaTypes";

describe('ActorRdfSerializeFixedMediaTypes', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfSerializeFixedMediaTypes module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeFixedMediaTypes).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeFixedMediaTypes constructor', () => {
      expect(new (<any> ActorRdfSerializeFixedMediaTypes)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSerializeFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfSerializeFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSerializeFixedMediaTypes)(); }).toThrow();
    });
  });

  describe('An ActorRdfSerializeFixedMediaTypes instance', () => {
    const actor = new (<any> ActorRdfSerializeFixedMediaTypes)({ name: 'actor', bus });

    it('should have a default testHandleChecked implementation', () => {
      return expect(actor.testHandleChecked(null)).resolves.toBeTruthy();
    });
  });
});
