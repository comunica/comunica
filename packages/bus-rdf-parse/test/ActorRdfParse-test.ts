import {Actor, Bus} from "@comunica/core";
import {ActorRdfParse} from "../lib/ActorRdfParse";

describe('ActorRdfParse', () => {
  describe('The ActorRdfParse module', () => {
    it('should be a function', () => {
      expect(ActorRdfParse).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParse constructor', () => {
      expect(new (<any> ActorRdfParse)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorRdfParse);
    });

    it('should not be able to create new ActorRdfParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParse)(); }).toThrow();
    });
  });
});
