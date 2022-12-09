import { Bus } from '@comunica/core';
import { ActorRdfParseShaclc } from '../lib/ActorRdfParseShaclc';


describe('ActorRdfParseShaclc', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfParseShaclc instance', () => {
    let actor: ActorRdfParseShaclc;

    beforeEach(() => {
      actor = new ActorRdfParseShaclc({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
