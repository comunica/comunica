import { Bus } from '@comunica/core';
import { ActorRuleParseFixedMediaTypes } from '../lib';

describe('ActorRuleParseFixedMediaTypes', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRuleParseFixedMediaTypes module', () => {
    it('should be a function', () => {
      expect(ActorRuleParseFixedMediaTypes).toBeInstanceOf(Function);
    });

    it('should be a ActorRuleParseFixedMediaTypes constructor', () => {
      expect(new (<any> ActorRuleParseFixedMediaTypes)({ bus: new Bus({ name: 'bus' }),
        mediaTypes: {},
        name: 'actor' })).toBeInstanceOf(ActorRuleParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRuleParseFixedMediaTypes objects without \'new\'', () => {
      expect(() => { (<any> ActorRuleParseFixedMediaTypes)(); }).toThrow();
    });
  });

  describe('An ActorRuleParseFixedMediaTypes instance', () => {
    const actor = new (<any> ActorRuleParseFixedMediaTypes)({ bus,
      mediaTypes: { a: 0.5 },
      name: 'actor',
      priorityScale: 0.5 });

    it('should always resolve testHandleChecked', () => {
      return expect(actor.testHandleChecked()).resolves.toBeTruthy();
    });
  });
});
