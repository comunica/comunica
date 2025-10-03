import { Bus } from '@comunica/core';
import { ActorQuerySourceIdentifyLinkTraversal } from '../lib/ActorQuerySourceIdentifyLinkTraversal';
import '@comunica/utils-jest';

describe('ActorQuerySourceIdentifyLinkTraversal', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceIdentifyLinkTraversal instance', () => {
    let actor: ActorQuerySourceIdentifyLinkTraversal;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyLinkTraversal({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toPassTestVoid(); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
