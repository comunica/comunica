import { Bus } from '@comunica/core';

// Import { ActorHttpCache } from '../lib/ActorHttpCache';

describe('ActorHttpCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });
  describe('An ActorHttpCache instance', () => {
    it('runs', () => {
      expect(true).toBeTruthy();
    });
  });
});
