import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDay } from '../lib/ActorFunctionFactoryTermFunctionDay';

describe('ActorFunctionFactoryTermFunctionDay', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDay instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDay;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDay({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
