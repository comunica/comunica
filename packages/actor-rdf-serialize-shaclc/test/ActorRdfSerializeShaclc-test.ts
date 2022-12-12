import { Bus } from '@comunica/core';
import { ActorRdfSerializeShaclc } from '../lib/ActorRdfSerializeShaclc';

describe('ActorRdfSerializeShaclc', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfSerializeShaclc instance', () => {
    let actor: ActorRdfSerializeShaclc;

    beforeEach(() => {
      actor = new ActorRdfSerializeShaclc({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
