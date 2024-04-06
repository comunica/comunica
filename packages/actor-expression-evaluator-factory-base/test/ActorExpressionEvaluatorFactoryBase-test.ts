import { Bus } from '@comunica/core';
import { getMockEEFactory } from '@comunica/jest';
import type { ActorExpressionEvaluatorFactoryBase } from '../lib/ActorExpressionEvaluatorFactoryBase';

describe('ActorExpressionEvaluatorFactoryBase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorExpressionEvaluatorFactoryBase instance', () => {
    let actor: ActorExpressionEvaluatorFactoryBase;

    beforeEach(() => {
      actor = getMockEEFactory();
    });

    it('should test', () => {
      // Return expect(actor.test({ context: getMockEvaluatorContext() })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      // Return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
