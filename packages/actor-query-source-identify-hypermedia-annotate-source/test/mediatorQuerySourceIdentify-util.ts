import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActionQuerySourceIdentifyHypermedia, MediatorQuerySourceIdentifyHypermedia }
  from '@comunica/bus-query-source-identify-hypermedia';
import { MetadataValidationState } from '@comunica/metadata';
import type { IQuerySource } from '@comunica/types';
import { wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new Factory();

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
