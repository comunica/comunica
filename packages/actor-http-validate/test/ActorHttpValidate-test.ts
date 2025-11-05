import { Bus } from '@comunica/core';
import { ActorHttpValidate } from '../lib/ActorHttpValidate';
import '@comunica/utils-jest';

describe('ActorHttpValidate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpValidate instance', () => {
    let actor: ActorHttpValidate;

    beforeEach(() => {
      actor = new ActorHttpValidate({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toPassTestVoid(); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
