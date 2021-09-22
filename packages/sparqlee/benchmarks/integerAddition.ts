// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */

import type * as RDF from '@rdfjs/types';
import type { Event } from 'benchmark';
import { Suite } from 'benchmark';
import * as Benchmark from 'benchmark';
import * as LRUCache from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import { SyncEvaluator } from '../lib/evaluators/SyncEvaluator';
import { Bindings } from '../lib/Types';
import { TypeURL } from '../lib/util/Consts';
import { template } from '../test/util/Aliases';

const benchSuite = new Suite();
const DF = new DataFactory();

function integerTerm(int: number): RDF.Term {
  return DF.literal(int.toString(), DF.namedNode(TypeURL.XSD_INTEGER));
}

const noCache = new Benchmark('bench addition no overloadCache', () => {
  const query = translate(template('?a + ?b = ?c'));
  const evaluator = new SyncEvaluator(query.input.expression, {
    enableExtendedXsdTypes: true,
    // Provide a cache that can not store anything
    overloadCache: new LRUCache({
      max: 1,
      length: () => 5,
    }),
  });
  const max = 100;
  for (let fst = 0; fst < max; fst++) {
    for (let snd = 0; snd < max; snd++) {
      evaluator.evaluate(Bindings({
        '?a': integerTerm(fst),
        '?b': integerTerm(snd),
        '?c': integerTerm(fst + snd),
      }));
    }
  }
});

const cache = new Benchmark('bench addition with overloadCache', () => {
  const query = translate(template('?a + ?b = ?c'));
  const evaluator = new SyncEvaluator(query.input.expression, {
    overloadCache: new LRUCache(),
    enableExtendedXsdTypes: true,
  });
  const max = 100;
  for (let fst = 0; fst < max; fst++) {
    for (let snd = 0; snd < max; snd++) {
      evaluator.evaluate(Bindings({
        '?a': integerTerm(fst),
        '?b': integerTerm(snd),
        '?c': integerTerm(fst + snd),
      }));
    }
  }
});

const nonExperimental = new Benchmark('bench addition non experimental', () => {
  const query = translate(template('?a + ?b = ?c'));
  const evaluator = new SyncEvaluator(query.input.expression);
  const max = 100;
  for (let fst = 0; fst < max; fst++) {
    for (let snd = 0; snd < max; snd++) {
      evaluator.evaluate(Bindings({
        '?a': integerTerm(fst),
        '?b': integerTerm(snd),
        '?c': integerTerm(fst + snd),
      }));
    }
  }
});

benchSuite.push(noCache);
benchSuite.push(cache);
benchSuite.push(nonExperimental);
benchSuite.on('cycle', (event: Event) => {
  console.log(String(event.target));
}).on('complete', () => {
  console.log(`Mean execution time without cache ${noCache.stats.mean}`);
  console.log(`Mean execution time with cache ${cache.stats.mean}`);
  console.log(`Mean execution time with nonExperimental ${nonExperimental.stats.mean}`);
  console.log(`Fastest is ${benchSuite.filter('fastest').map('name')}`);
}).run({ async: true });
