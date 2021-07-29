import {testAll} from '../util/utils';
import {DataFactory} from 'rdf-data-factory';
import {AsyncEvaluatorConfig} from '../../lib/evaluators/AsyncEvaluator';
const DF = new DataFactory();

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  let blankNodeCounter = 0;
  const config: AsyncEvaluatorConfig = {
    bnode: (input?: string) => Promise.resolve(DF.blankNode(`${input || 'b'}${blankNodeCounter++}`)),
  };
  testAll([
    'BNODE() = _:b0',
    'BNODE("hello") = _:hello1',
  ], config);
});
