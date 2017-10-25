import {Actor, Bus} from "@comunica/core";
import {ActorRdfParse} from "../lib/ActorRdfParse";

describe('ActorRdfParse', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfParse module', () => {
    it('should be a function', () => {
      expect(ActorRdfParse).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParse constructor', () => {
      expect(new (<any> ActorRdfParse)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorRdfParse);
      expect(new (<any> ActorRdfParse)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorRdfParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParse)(); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorRdfParse)(); }).toThrow();
    });
  });

  describe('An ActorRdfParse instance', () => {
    const actor = new (<any> ActorRdfParse)({ bus, name: 'actor' });

    it('should test for a media type action', () => {
      actor.testMediaType = () => Promise.resolve(true);
      return expect(actor.test({ mediaType: true })).resolves.toBeTruthy();
    });

    it('should test for a parse action', () => {
      actor.testParse = () => Promise.resolve(true);
      return expect(actor.test({ parse: { mediaType: 'a' } })).resolves.toBeTruthy();
    });

    it('should not test for an invalid action', () => {
      return expect(actor.test({ invalid: true })).rejects.toBeTruthy();
    });

    it('should run for a media type action', () => {
      actor.runMediaType = () => Promise.resolve(true);
      return expect(actor.run({ mediaType: true })).resolves.toBeTruthy();
    });

    it('should run for a parse action', () => {
      actor.runParse = () => Promise.resolve(true);
      return expect(actor.run({ parse: { mediaType: 'a' } })).resolves.toBeTruthy();
    });

    it('should not run for an invalid action', () => {
      return expect(actor.run({ invalid: true })).rejects.toBeTruthy();
    });
  });
});
