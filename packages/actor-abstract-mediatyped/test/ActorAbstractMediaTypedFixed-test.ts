import { Actor, Bus } from '@comunica/core';
import { ActorAbstractMediaTyped } from '../lib/ActorAbstractMediaTyped';
import { ActorAbstractMediaTypedFixed } from '../lib/ActorAbstractMediaTypedFixed';

describe('ActorAbstractMediaTypedFixed', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorAbstractMediaTypedFixed module', () => {
    it('should be a function', () => {
      expect(ActorAbstractMediaTypedFixed).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractMediaTypedFixed constructor', () => {
      expect(new (<any> ActorAbstractMediaTypedFixed)({ bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor' })).toBeInstanceOf(ActorAbstractMediaTypedFixed);
      expect(new (<any> ActorAbstractMediaTypedFixed)({ bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor' })).toBeInstanceOf(ActorAbstractMediaTyped);
      expect(new (<any> ActorAbstractMediaTypedFixed)({ bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor' })).toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractMediaTypedFixed objects without \'new\'', () => {
      expect(() => { (<any> ActorAbstractMediaTypedFixed)(); }).toThrow();
    });
  });

  describe('An ActorAbstractMediaTypedFixed instance', () => {
    const actor = new (<any> ActorAbstractMediaTypedFixed)({ bus,
      mediaTypePriorities: { a: 0.5 },
      mediaTypeFormats: { a: 'a' },
      name: 'actor',
      priorityScale: 0.5 });
    actor.testHandleChecked = () => Promise.resolve(true);

    it('should have a \'priorityScale\' field', () => {
      return expect(actor.priorityScale).toEqual(0.5);
    });

    it('should have a \'mediaTypePriorities\' field that is scaled', () => {
      return expect(actor.mediaTypePriorities).toEqual({ a: 0.25 });
    });

    it('should testHandle for a valid media type', () => {
      return expect(actor.testHandle(null, 'a')).resolves.toBeTruthy();
    });

    it('should not testHandle for an invalid media type', () => {
      return expect(actor.testHandle(null, 'b')).rejects.toBeTruthy();
    });

    it('should not testHandle for an undefined media type', () => {
      return expect(actor.testHandle(null)).rejects.toBeTruthy();
    });

    it('should always testMediaType', () => {
      return expect(actor.testMediaType()).resolves.toBeTruthy();
    });

    it('should runMediaType', () => {
      return expect(actor.getMediaTypes()).resolves.toEqual({ a: 0.25 });
    });

    it('should always testMediaTypeFormats', () => {
      return expect(actor.testMediaTypeFormats()).resolves.toBeTruthy();
    });

    it('should runMediaTypeFormats', () => {
      return expect(actor.getMediaTypeFormats()).resolves.toEqual({ a: 'a' });
    });
  });
});
