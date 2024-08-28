import { Bus } from '@comunica/core';
import { ActorFunctionFactoryExpressionFunctionSameTerm } from '../lib/ActorFunctionFactoryExpressionFunctionSameTerm';

describe('ActorFunctionFactoryExpressionFunctionSameTerm', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryExpressionFunctionSameTerm instance', () => {
    let actor: ActorFunctionFactoryExpressionFunctionSameTerm;

    beforeEach(() => {
      actor = new ActorFunctionFactoryExpressionFunctionSameTerm({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
