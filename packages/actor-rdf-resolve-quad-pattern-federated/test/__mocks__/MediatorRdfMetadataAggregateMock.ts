import type { IActionRdfMetadataAggregate } from '@comunica/bus-rdf-metadata-aggregate';

export const mockedMediatorAgg = {
  mediate(action: IActionRdfMetadataAggregate) {
    const { metadata, subMetadata, empty } = action;

    let aggregatedMetadata: Record<string, any> = {};
    if (empty) {
      // Set metadata for an empty source
      aggregatedMetadata = { totalItems: 0 };
    } else if ((metadata === undefined) || !Number.isFinite(metadata.totalItems)) {
      // Set totalItems to infinity
      aggregatedMetadata = { ...metadata, ...subMetadata, totalItems: Number.POSITIVE_INFINITY };
    } else {
      // Set totalItems to the sum of metadata and subMetadata's totalItems
      aggregatedMetadata = { ...metadata,
        ...subMetadata,
        totalItems: Number(metadata.totalItems) + Number(subMetadata!.totalItems) };
    }

    return Promise.resolve({ aggregatedMetadata });
  }
  ,
};
