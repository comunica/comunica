import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrDt } from '../lib/ActorFunctionFactoryTermFunctionStrDt';

describe('ActorFunctionFactoryTermFunctionStrDt', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrDt instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrDt;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrDt({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
