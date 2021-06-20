import {Record} from "immutable";

export const mockedMediatorAgg = {
    mediate(action: any) {

        const {metadata, subMetadata} = action
        console.log(`
        mediatatorAggregate.mediate
          metadata: ${JSON.stringify(metadata)}
          subMetadata: ${JSON.stringify(subMetadata)}
      `)

        let newTotalItems: number = 0
        const isEmptyRecord = (r: Record<string, any>) => Object.keys(r).length === 0
        const hasTotalItems = (r: Record<string, any>) => r.totalItems !== undefined
        let resultRecord = {}

        if (!subMetadata) {
            // submetadata not defined
            resultRecord = metadata
        } else {
            // submetadata IS defined
            const metadataHasTotalItems = hasTotalItems(metadata)
            const subMetadataHasTotalItems = hasTotalItems(subMetadata)


            if (metadataHasTotalItems && subMetadataHasTotalItems) {
                // metadata has total items & submetadata has total items
                newTotalItems = metadata.totalItems + subMetadata.totalItems
            } else if (!metadataHasTotalItems && !subMetadataHasTotalItems) {
                // neither metadata or submetadata has totalItems
                newTotalItems = Number.POSITIVE_INFINITY
            } else if (!metadataHasTotalItems && subMetadata) {
                // metadata does not have total items
                newTotalItems = subMetadata.totalItems

            } else {
                if (isEmptyRecord(subMetadata)) {
                    newTotalItems = Number.POSITIVE_INFINITY;
                } else {
                    throw  Error('CASE NOT COVERED YET')
                }
            }
        }

        resultRecord = {
            ...subMetadata,
            ...metadata,
            totalItems: newTotalItems
        }

        return Promise.resolve(
            {
                aggregatedMetadata: {
                    ...resultRecord
                }
            }
        )
    }
}