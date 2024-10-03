import type { IActionQuerySourceIdentifyHypermedia, MediatorQuerySourceIdentifyHypermedia }
  from '@comunica/bus-query-source-identify-hypermedia';
import type { IQuerySource } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

// @ts-expect-error
export const mediatorQuerySourceIdentifyHypermedia: MediatorQuerySourceIdentifyHypermedia = {
  async mediate({ quads, url }: IActionQuerySourceIdentifyHypermedia) {
    const quadsIterator = wrap(quads);
    return {
      dataset: 'MYDATASET',
      source: <IQuerySource> <any> {
        referenceValue: url,
        queryBindings() {
          const it = quadsIterator.clone().transform({
            map: q => BF.fromRecord({
              s: q.subject,
              p: q.predicate,
              o: q.object,
              g: q.graph,
            }),
            autoStart: false,
          });
          it.setProperty('metadata', { firstMeta: true, state: new MetadataValidationState() });
          return it;
        },
      },
    };
  },
};
