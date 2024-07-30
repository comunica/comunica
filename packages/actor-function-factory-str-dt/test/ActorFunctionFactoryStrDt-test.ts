import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrDt } from '../lib/ActorFunctionFactoryStrDt';

describe('ActorFunctionFactoryStrDt', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrDt instance', () => {
    let actor: ActorFunctionFactoryStrDt;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrDt({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
