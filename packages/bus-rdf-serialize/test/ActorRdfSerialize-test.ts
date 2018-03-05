import {Bus} from "@comunica/core";
import {ActorRdfSerialize} from "../lib/ActorRdfSerialize";

describe('ActorRdfSerialize', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfSerialize module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerialize).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerialize constructor', () => {
      expect(new (<any> ActorRdfSerialize)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSerialize);
    });

    it('should not be able to create new ActorRdfSerialize objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSerialize)(); }).toThrow();
    });
  });
});
