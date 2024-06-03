import { Bus } from '@comunica/core';
import { ActorPathQueryingOneHop } from '../lib/ActorPathQueryingOneHop';

describe('ActorPathQueryingOneHop', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorPathQueryingOneHop instance', () => {
    let actor: ActorPathQueryingOneHop;

    beforeEach(() => {
      actor = new ActorPathQueryingOneHop({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
