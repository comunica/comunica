import {Bus} from "@comunica/core";
import {ActorSparqlSerialize} from "../lib/ActorSparqlSerialize";

describe('ActorSparqlSerialize', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorSparqlSerialize module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerialize).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerialize constructor', () => {
      expect(new (<any> ActorSparqlSerialize)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorSparqlSerialize);
    });

    it('should not be able to create new ActorSparqlSerialize objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerialize)(); }).toThrow();
    });
  });
});
