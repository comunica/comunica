import { ActorDereference } from '@comunica/bus-dereference';
import { Bus } from '@comunica/core';
import { ActorDereferenceFile } from '../lib/ActorDereferenceFile';

describe('ActorDereferenceFile', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorDereferenceFile instance', () => {
    let actor: ActorDereferenceFile;

    beforeEach(() => {
      actor = new ActorDereferenceFile({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
