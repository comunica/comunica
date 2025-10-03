import { Bus } from '@comunica/core';
import { ActorContextPreprocessInitializeLinkTraversalManager } from '../lib/ActorContextPreprocessInitializeLinkTraversalManager';

describe('ActorContextPreprocessInitializeLinkTraversalManager', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessInitializeLinkTraversalManager instance', () => {
    let actor: ActorContextPreprocessInitializeLinkTraversalManager;

    beforeEach(() => {
      actor = new ActorContextPreprocessInitializeLinkTraversalManager({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
