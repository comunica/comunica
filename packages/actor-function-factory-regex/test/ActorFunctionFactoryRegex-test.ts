import { Bus } from '@comunica/core';
import { ActorFunctionFactoryRegex } from '../lib/ActorFunctionFactoryRegex';

describe('ActorFunctionFactoryRegex', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryRegex instance', () => {
    let actor: ActorFunctionFactoryRegex;

    beforeEach(() => {
      actor = new ActorFunctionFactoryRegex({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
