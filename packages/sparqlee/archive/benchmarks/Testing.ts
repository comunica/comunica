/* tslint:disable:no-console */
import * as RDF from 'rdf-data-model';

import { Bindings } from '../src/core/FilteredStreams';
import { SyncEvaluator } from '../src/sync/SyncEvaluator';
import { DataType as DT } from '../src/util/Consts';
import { Example } from './Examples';

const example1 = (() => {
  const str = 'bound(?a)';
  // const str = '10000 > ?age';
  const mapping = () => Bindings({
    a: RDF.literal('20', RDF.namedNode(DT.XSD_INTEGER)),
    b: RDF.literal('30', RDF.namedNode(DT.XSD_INTEGER)),
    c: RDF.literal('50', RDF.namedNode(DT.XSD_INTEGER))
  });
  return new Example(str, mapping);
})();

console.log(JSON.stringify(example1.expression, null, 4));

// const evaluator = new SyncEvaluator(example1.expression);
// console.log(evaluator.evaluate(example1.mapping()));
