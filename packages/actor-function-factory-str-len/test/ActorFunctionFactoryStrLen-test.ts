import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrLen } from '../lib/ActorFunctionFactoryStrLen';

describe('ActorFunctionFactoryStrLen', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrLen instance', () => {
    let actor: ActorFunctionFactoryStrLen;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrLen({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
