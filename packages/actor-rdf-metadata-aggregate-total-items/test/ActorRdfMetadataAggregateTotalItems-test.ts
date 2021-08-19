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
      return expect(actor.test({ metadata: {}, subMetadata: {}})).resolves.toBeTruthy();
    });

    it('should return 0 totalItems when parameter empty is true', () => {
      return expect(actor.run({ metadata: {}, empty: true }))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: 0 }});
    });

    it('should return the sum of totalItems in metadata and submetadata', () => {
      return expect(actor.run({ metadata: { totalItems: 1 }, subMetadata: { totalItems: 1 }}))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: 2 }});
    });

    it('should return infinity when metadata totalItems is infinite and submetadata totalItems is finite', () => {
      return expect(actor.run({ metadata: { totalItems: Number.POSITIVE_INFINITY }, subMetadata: { totalItems: 1 }}))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: Number.POSITIVE_INFINITY }});
    });

    it('should return infinity when metadata totalItems is finite and submetadata totalItems is infinite', () => {
      return expect(actor.run({ metadata: { totalItems: 1 }, subMetadata: { totalItems: Number.POSITIVE_INFINITY }}))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: Number.POSITIVE_INFINITY }});
    });

    it('should return infinity when metadata and submetadata are empty', () => {
      return expect(actor.run({ metadata: {}, subMetadata: {}}))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: Number.POSITIVE_INFINITY }});
    });

    it('should return infinity when metadata totalItems is empty and submetadata totalItems is infinite', () => {
      return expect(actor.run({ metadata: {}, subMetadata: { totalItems: Number.POSITIVE_INFINITY }}))
        .resolves.toEqual({ aggregatedMetadata: { totalItems: Number.POSITIVE_INFINITY }});
    });
  });
});
