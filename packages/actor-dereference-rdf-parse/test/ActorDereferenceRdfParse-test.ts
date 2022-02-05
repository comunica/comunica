import { ActorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import { Bus } from '@comunica/core';
import { ActorDereferenceRdfParse } from '../lib/ActorDereferenceRdfParse';

describe('ActorDereferenceRdfParse', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorDereferenceRdfParse instance', () => {
    let actor: ActorDereferenceRdfParse;

    beforeEach(() => {
      actor = new ActorDereferenceRdfParse({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
