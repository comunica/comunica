import type { IActionRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';
import type { Record } from 'immutable';

export const mockedMediatorAgg = {
  mediate(action: IActionRdfMetadataAggregate) {
    const { metadata, subMetadata, empty } = action;

    if (empty) {
      return Promise.resolve({ aggregatedMetadata: { totalItems: 0 }});
    }

    let newTotalItems = 0;
    const hasTotalItems =
        (record: Record<string, any> | undefined): boolean => Boolean(record) && record!.totalItems !== undefined;
    let resultRecord = {};

    // Submetadata IS defined
    const metadataHasTotalItems = hasTotalItems(metadata);
    const subMetadataHasTotalItems = hasTotalItems(subMetadata);

    if (!metadataHasTotalItems || !subMetadataHasTotalItems) {
      // Neither metadata or submetadata has totalItems
      newTotalItems = Number.POSITIVE_INFINITY;
    } else {
      // Metadata has total items & submetadata has total items
      newTotalItems = Number(metadata!.totalItems) + Number(subMetadata!.totalItems);
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
  }
  ,
};
