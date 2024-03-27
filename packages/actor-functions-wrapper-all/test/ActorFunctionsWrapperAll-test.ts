import { Bus } from '@comunica/core';
import { ActorFunctionsWrapperAll } from '../lib/ActorFunctionsWrapperAll';

describe('ActorFunctionsWrapperAll', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionsWrapperAll instance', () => {
    let actor: ActorFunctionsWrapperAll;

    beforeEach(() => {
      actor = new ActorFunctionsWrapperAll({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
