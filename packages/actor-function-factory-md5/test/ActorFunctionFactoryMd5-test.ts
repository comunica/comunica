import { Bus } from '@comunica/core';
import { ActorFunctionFactoryMd5 } from '../lib/ActorFunctionFactoryMd5';

describe('ActorFunctionFactoryMd5', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryMd5 instance', () => {
    let actor: ActorFunctionFactoryMd5;

    beforeEach(() => {
      actor = new ActorFunctionFactoryMd5({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
