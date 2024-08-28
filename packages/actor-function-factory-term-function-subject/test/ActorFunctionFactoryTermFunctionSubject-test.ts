import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubject } from '../lib/ActorFunctionFactoryTermFunctionSubject';

describe('ActorFunctionFactoryTermFunctionSubject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubject instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubject;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubject({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
