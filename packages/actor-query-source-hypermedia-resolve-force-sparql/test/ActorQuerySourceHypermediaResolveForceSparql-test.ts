import { Bus } from '@comunica/core';
import { ActorQuerySourceHypermediaResolveForceSparql } from '../lib/ActorQuerySourceHypermediaResolveForceSparql';
import '@comunica/utils-jest';

describe('ActorQuerySourceHypermediaResolveForceSparql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceHypermediaResolveForceSparql instance', () => {
    let actor: ActorQuerySourceHypermediaResolveForceSparql;

    beforeEach(() => {
      actor = new ActorQuerySourceHypermediaResolveForceSparql({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toPassTestVoid(); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
