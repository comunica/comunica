import {Actor, Bus} from "@comunica/core";
import {ActorAbstractMediaTyped} from "../lib/ActorAbstractMediaTyped";

describe('ActorAbstractMediaTyped', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorAbstractMediaTyped module', () => {
    it('should be a function', () => {
      expect(ActorAbstractMediaTyped).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractMediaTyped constructor', () => {
      expect(new (<any> ActorAbstractMediaTyped)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorAbstractMediaTyped);
      expect(new (<any> ActorAbstractMediaTyped)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractMediaTyped objects without \'new\'', () => {
      expect(() => { (<any> ActorAbstractMediaTyped)(); }).toThrow();
    });
  });

  describe('An ActorAbstractMediaTyped instance', () => {
    const actor = new (<any> ActorAbstractMediaTyped)({ bus, name: 'actor' });

    it('should test for a media type action', () => {
      actor.testMediaType = () => Promise.resolve(true);
      return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
    });

    it('should test for a media type format action', () => {
      actor.testMediaTypeFormats = () => Promise.resolve(true);
      return expect(actor.test({ mediaTypeFormats: true })).resolves.toBeTruthy();
    });

    it('should test for a handle action', () => {
      actor.testHandle = () => Promise.resolve(true);
      return expect(actor.test({ handle: true, handleMediaType: 'a' })).resolves.toBeTruthy();
    });

    it('should not test for an invalid action', () => {
      return expect(actor.test({ invalid: true })).rejects.toBeTruthy();
    });

    it('should run for a media type action', () => {
      actor.getMediaTypes = () => Promise.resolve(true);
      return expect(actor.run({ mediaTypes: true })).resolves.toBeTruthy();
    });

    it('should run for a media type format action', () => {
      actor.getMediaTypeFormats = () => Promise.resolve(true);
      return expect(actor.run({ mediaTypeFormats: true })).resolves.toBeTruthy();
    });

    it('should run for a handle action', () => {
      actor.runHandle = () => Promise.resolve(true);
      return expect(actor.run({ handle: true, handleMediaType: 'a' })).resolves.toBeTruthy();
    });

    it('should not run for an invalid action', () => {
      return expect(actor.run({ invalid: true })).rejects.toBeTruthy();
    });
  });
});
