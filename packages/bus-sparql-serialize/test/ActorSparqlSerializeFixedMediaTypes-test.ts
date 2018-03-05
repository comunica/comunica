import {Bus} from "@comunica/core";
import {ActorSparqlSerializeFixedMediaTypes} from "../lib/ActorSparqlSerializeFixedMediaTypes";

describe('ActorSparqlSerializeFixedMediaTypes', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorSparqlSerializeFixedMediaTypes module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeFixedMediaTypes).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeFixedMediaTypes constructor', () => {
      expect(new (<any> ActorSparqlSerializeFixedMediaTypes)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerializeFixedMediaTypes);
    });

    it('should not be able to create new ActorSparqlSerializeFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeFixedMediaTypes)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeFixedMediaTypes instance', () => {
    const actor = new (<any> ActorSparqlSerializeFixedMediaTypes)({ name: 'actor', bus });

    it('should have a default testHandleChecked implementation', () => {
      return expect(actor.testHandleChecked(null)).resolves.toBeTruthy();
    });
  });
});
