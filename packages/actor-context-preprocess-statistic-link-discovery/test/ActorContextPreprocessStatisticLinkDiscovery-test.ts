import { Bus } from '@comunica/core';
import { ActorContextPreprocessStatisticLinkDiscovery } from '../lib/ActorContextPreprocessStatisticLinkDiscovery';

describe('ActorContextPreprocessStatisticLinkDiscovery', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessStatisticLinkDiscovery instance', () => {
    let actor: ActorContextPreprocessStatisticLinkDiscovery;

    beforeEach(() => {
      actor = new ActorContextPreprocessStatisticLinkDiscovery({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
