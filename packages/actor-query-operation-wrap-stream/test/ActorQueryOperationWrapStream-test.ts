import { Bus } from '@comunica/core';
import { ActorQueryOperationWrapStream } from '../lib/ActorQueryOperationWrapStream';

describe('ActorQueryOperationWrapStream', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQueryOperationWrapStream instance', () => {
    let actor: ActorQueryOperationWrapStream;

    beforeEach(() => {
      actor = new ActorQueryOperationWrapStream({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
