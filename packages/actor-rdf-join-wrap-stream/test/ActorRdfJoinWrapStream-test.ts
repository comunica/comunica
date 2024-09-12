import { Bus } from '@comunica/core';
import { ActorRdfJoinWrapStream } from '../lib/ActorRdfJoinWrapStream';

describe('ActorRdfJoinWrapStream', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfJoinWrapStream instance', () => {
    let actor: ActorRdfJoinWrapStream;

    beforeEach(() => {
      actor = new ActorRdfJoinWrapStream({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
