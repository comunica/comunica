import { Actor, Bus, passTestVoid } from '@comunica/core';
import { ActorAbstractMediaTyped } from '../lib/ActorAbstractMediaTyped';
import { ActorAbstractMediaTypedFixed } from '../lib/ActorAbstractMediaTypedFixed';
import '@comunica/utils-jest';

describe('ActorAbstractMediaTypedFixed', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorAbstractMediaTypedFixed module', () => {
    it('should be a function', () => {
      expect(ActorAbstractMediaTypedFixed).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractMediaTypedFixed constructor', () => {
      expect(new (<any> ActorAbstractMediaTypedFixed)({
        bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor',
      })).toBeInstanceOf(ActorAbstractMediaTypedFixed);
      expect(new (<any> ActorAbstractMediaTypedFixed)({
        bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor',
      })).toBeInstanceOf(ActorAbstractMediaTyped);
      expect(new (<any> ActorAbstractMediaTypedFixed)({
        bus: new Bus({ name: 'bus' }),
        mediaTypePriorities: {},
        name: 'actor',
      })).toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractMediaTypedFixed objects without \'new\'', () => {
      expect(() => {
        (<any> ActorAbstractMediaTypedFixed)();
      }).toThrow(`Class constructor ActorAbstractMediaTypedFixed cannot be invoked without 'new'`);
    });
  });

  describe('An ActorAbstractMediaTypedFixed instance', () => {
    const actor = new (<any> ActorAbstractMediaTypedFixed)({
      bus,
      mediaTypePriorities: { a: 0.5 },
      mediaTypeFormats: { a: 'a' },
      name: 'actor',
      priorityScale: 0.5,
    });
    actor.testHandleChecked = () => Promise.resolve(passTestVoid());

    it('should have a \'priorityScale\' field', () => {
      expect(actor.priorityScale).toBe(0.5);
    });

    it('should have a \'mediaTypePriorities\' field that is scaled', () => {
      expect(actor.mediaTypePriorities).toEqual({ a: 0.25 });
    });

    it('should testHandle for a valid media type', async() => {
      await expect(actor.testHandle(null, 'a')).resolves.toPassTestVoid();
    });

    it('should not testHandle for an invalid media type', async() => {
      await expect(actor.testHandle(null, 'b')).resolves.toFailTest(`Unrecognized media type: b`);
    });

    it('should not testHandle for an undefined media type', async() => {
      await expect(actor.testHandle(null)).resolves.toFailTest(`Unrecognized media type: undefined`);
    });

    it('should always testMediaType', async() => {
      await expect(actor.testMediaType()).resolves.toBeTruthy();
    });

    it('should runMediaType', async() => {
      await expect(actor.getMediaTypes()).resolves.toEqual({ a: 0.25 });
    });

    it('should always testMediaTypeFormats', async() => {
      await expect(actor.testMediaTypeFormats()).resolves.toBeTruthy();
    });

    it('should runMediaTypeFormats', async() => {
      await expect(actor.getMediaTypeFormats()).resolves.toEqual({ a: 'a' });
    });
  });
});
