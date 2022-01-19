import { ActorDereference } from '@comunica/bus-dereference';
import { Bus } from '@comunica/core';
import { ActorDereferenceHttp } from '../lib/ActorDereferenceHttp';

describe('ActorDereferenceHttp', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorDereferenceHttp instance', () => {
    let actor: ActorDereferenceHttp;

    beforeEach(() => {
      actor = new ActorDereferenceHttp({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
