import { Bus } from '@comunica/core';
import { ActorFunctionFactoryReplace } from '../lib/ActorFunctionFactoryReplace';

describe('ActorFunctionFactoryReplace', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryReplace instance', () => {
    let actor: ActorFunctionFactoryReplace;

    beforeEach(() => {
      actor = new ActorFunctionFactoryReplace({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
