import { ActorRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';
import { Bus } from '@comunica/core';
import { ActorRdfMetadataAggregateTotalItems } from '../lib/ActorRdfMetadataAggregateTotalItems';

describe('ActorRdfMetadataAggregateTotalItems', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataAggregateTotalItems instance', () => {
    let actor: ActorRdfMetadataAggregateTotalItems;

    beforeEach(() => {
      actor = new ActorRdfMetadataAggregateTotalItems({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
