import { Bus } from '@comunica/core';
import { ActorRuleParse } from '../lib';

describe('ActorRuleParse', () => {
  describe('The ActorRuleParse module', () => {
    it('should be a function', () => {
      expect(ActorRuleParse).toBeInstanceOf(Function);
    });

    it('should be a ActorRuleParse constructor', () => {
      expect(new (<any> ActorRuleParse)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorRuleParse);
    });

    it('should not be able to create new ActorRuleParse objects without \'new\'', () => {
      expect(() => { (<any> ActorRuleParse)(); }).toThrow();
    });
  });
});
