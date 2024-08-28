import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionFloor } from '../lib/ActorFunctionFactoryTermFunctionFloor';

describe('ActorFunctionFactoryTermFunctionFloor', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionFloor instance', () => {
    let actor: ActorFunctionFactoryTermFunctionFloor;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionFloor({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
