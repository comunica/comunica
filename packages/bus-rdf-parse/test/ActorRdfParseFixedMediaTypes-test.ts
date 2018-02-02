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
    });

    it('should not be able to create new ActorRdfParseFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseFixedMediaTypes)(); }).toThrow();
    });
  });

  describe('An ActorRdfParseFixedMediaTypes instance', () => {
    const actor = new (<any> ActorRdfParseFixedMediaTypes)({ bus, mediaTypes: { a: 0.5 }, name: 'actor',
      priorityScale: 0.5 });

    it('should always resolve testHandleChecked', () => {
      return expect(actor.testHandleChecked()).resolves.toBeTruthy();
    });
  });
});
