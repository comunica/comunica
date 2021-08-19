import type { IActionRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';
import type { Record } from 'immutable';

export const mockedMediatorAgg = {
  mediate(action: IActionRdfMetadataAggregate) {
    const { metadata, subMetadata, empty } = action;
    if (empty) {
      return Promise.resolve({ aggregatedMetadata: { totalItems: 0 }});
    }
    let newTotalItems = 0;
    const isEmptyRecord = (r: Record<string, any>) => Object.keys(r).length === 0;
    const hasTotalItems = (r: Record<string, any>) => r && r.totalItems !== undefined;
    let resultRecord = {};

    if (isEmptyRecord(metadata))
    { newTotalItems = Number.POSITIVE_INFINITY; }
    else if (!subMetadata) {
      // Submetadata not defined
      resultRecord = metadata;
    } else {
      // Submetadata IS defined
      const metadataHasTotalItems = hasTotalItems(metadata);
      const subMetadataHasTotalItems = hasTotalItems(subMetadata);

      if (metadataHasTotalItems && subMetadataHasTotalItems) {
        // Metadata has total items & submetadata has total items
        newTotalItems = metadata.totalItems + subMetadata.totalItems;
      } else if (!metadataHasTotalItems && !subMetadataHasTotalItems) {
        // Neither metadata or submetadata has totalItems
        newTotalItems = Number.POSITIVE_INFINITY;
      } else if (!metadataHasTotalItems && subMetadata) {
        // Metadata does not have total items
        newTotalItems = subMetadata.totalItems;
      } else if (isEmptyRecord(subMetadata)) {
        newTotalItems = Number.POSITIVE_INFINITY;
      } else {
        throw new Error('CASE NOT COVERED YET');
      }
    }

    resultRecord = {
      ...subMetadata,
      ...metadata,
      totalItems: newTotalItems,
    };

    return Promise.resolve(
      {
        aggregatedMetadata: {
          ...resultRecord,
        },
      },
    );
  },
};
