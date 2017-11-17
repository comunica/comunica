import {Actor, Bus} from "@comunica/core";
import {ActorRdfParse} from "../lib/ActorRdfParse";
import {ActorRdfParseFixedMediaTypes} from "../lib/ActorRdfParseFixedMediaTypes";

describe('ActorRdfParseFixedMediaTypes', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfParseFixedMediaTypes module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseFixedMediaTypes).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseFixedMediaTypes constructor', () => {
      expect(new (<any> ActorRdfParseFixedMediaTypes)({ bus: new Bus({ name: 'bus' }), mediaTypes: {},
        name: 'actor' })).toBeInstanceOf(ActorRdfParseFixedMediaTypes);
      expect(new (<any> ActorRdfParseFixedMediaTypes)({ bus: new Bus({ name: 'bus' }), mediaTypes: {},
        name: 'actor' })).toBeInstanceOf(ActorRdfParse);
      expect(new (<any> ActorRdfParseFixedMediaTypes)({ bus: new Bus({ name: 'bus' }), mediaTypes: {},
        name: 'actor' })).toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorRdfParseFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseFixedMediaTypes)(); }).toThrow();
    });

    it('should throw an error when constructed without mediaTypes', () => {
      expect(() => { new (<any> ActorRdfParseFixedMediaTypes)({ name: 'actor', bus }); }).toThrow();
    });
  });

  describe('An ActorRdfParseFixedMediaTypes instance', () => {
    const actor = new (<any> ActorRdfParseFixedMediaTypes)({ bus, mediaTypes: { a: 0.5 }, name: 'actor',
      priorityScale: 0.5 });

    it('should have a \'priorityScale\' field', () => {
      return expect(actor.priorityScale).toEqual(0.5);
    });

    it('should have a \'mediaTypes\' field that is scaled', () => {
      return expect(actor.mediaTypes).toEqual({ a: 0.25 });
    });

    it('should testParse for a valid media type', () => {
      return expect(actor.testParse({ mediaType: 'a' })).resolves.toBeTruthy();
    });

    it('should not testParse for an invalid media type', () => {
      return expect(actor.testParse({ mediaType: 'b' })).rejects.toBeTruthy();
    });

    it('should runMediaType', () => {
      return expect(actor.runMediaType()).resolves.toEqual({ mediaTypes: { a: 0.25 } });
    });
  });
});
