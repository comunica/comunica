import { Bus } from '@comunica/core';
import { ActorFunctionFactoryHours } from '../lib/ActorFunctionFactoryHours';

describe('ActorFunctionFactoryHours', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryHours instance', () => {
    let actor: ActorFunctionFactoryHours;

    beforeEach(() => {
      actor = new ActorFunctionFactoryHours({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
