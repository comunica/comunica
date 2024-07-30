import { Bus } from '@comunica/core';
import { ActorFunctionFactoryDatatype } from '../lib/ActorFunctionFactoryDatatype';

describe('ActorFunctionFactoryDatatype', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryDatatype instance', () => {
    let actor: ActorFunctionFactoryDatatype;

    beforeEach(() => {
      actor = new ActorFunctionFactoryDatatype({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
