import { Bus } from '@comunica/core';
import { ActorRdfMetadataExtractVoid } from '../lib/ActorRdfMetadataExtractVoid';

describe('ActorRdfMetadataExtractVoid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractVoid instance', () => {
    let actor: ActorRdfMetadataExtractVoid;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractVoid({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
