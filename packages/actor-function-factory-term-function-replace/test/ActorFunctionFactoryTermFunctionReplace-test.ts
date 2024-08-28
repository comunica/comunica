import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionReplace } from '../lib/ActorFunctionFactoryTermFunctionReplace';

describe('ActorFunctionFactoryTermFunctionReplace', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionReplace instance', () => {
    let actor: ActorFunctionFactoryTermFunctionReplace;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionReplace({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
