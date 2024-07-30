import { Bus } from '@comunica/core';
import { ActorFunctionFactorySubject } from '../lib/ActorFunctionFactorySubject';

describe('ActorFunctionFactorySubject', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySubject instance', () => {
    let actor: ActorFunctionFactorySubject;

    beforeEach(() => {
      actor = new ActorFunctionFactorySubject({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
