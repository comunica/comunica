import { Bus } from '@comunica/core';
import { ActorQuerySourceHypermediaResolveDereference } from '../lib/ActorQuerySourceHypermediaResolveDereference';
import '@comunica/utils-jest';

describe('ActorQuerySourceHypermediaResolveDereference', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceHypermediaResolveDereference instance', () => {
    let actor: ActorQuerySourceHypermediaResolveDereference;

    beforeEach(() => {
      actor = new ActorQuerySourceHypermediaResolveDereference({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toPassTestVoid(); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
