import { Bus } from '@comunica/core';
import { ActorFunctionFactoryDay } from '../lib/ActorFunctionFactoryDay';

describe('ActorFunctionFactoryDay', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryDay instance', () => {
    let actor: ActorFunctionFactoryDay;

    beforeEach(() => {
      actor = new ActorFunctionFactoryDay({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
