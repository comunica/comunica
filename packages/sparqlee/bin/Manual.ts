#! /usr/bin/env node
import * as RDF from 'rdf-data-model';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { AsyncEvaluator } from '../lib/async/AsyncEvaluator';
import { Bindings } from '../lib/core/Types';
import { DataType as DT } from '../lib/util/Consts';
import * as C from '../lib/util/Consts';
import * as U from '../util/Util';
// import { Example, example1, mockLookUp, parse, parseFull } from '../util/Util';

function print(expr: string, full?: boolean): void {
  const parsedExpr = (full) ? U.parseFull(expr) : U.parse(expr);
  console.log(JSON.stringify(parsedExpr, null, 4));
}

async function testEval() {
  const ex = new U.Example('langMatches(?a, "de-*-DE")', () => Bindings({
    'a': RDF.literal('aaa'),
  }));
  const evaluator = new AsyncEvaluator(ex.expression, U.mockLookUp, U.mockAggregator);
  const presult = evaluator.evaluate(ex.mapping()).catch((err) => console.log(err));
  const val = await presult;
  console.log(val);
}

testEval();
// print('SELECT (strlen(?s) as ?l) WHERE { ?s ?p ?o }', true);
// print('isIRI(<mailto:test@example.com>)');
// print('bound(?a)');
// print('IF(?a, ?a, ?a)');
// print('coalesce(?a, ?a)');
// print('NOT EXISTS {}');
// print('EXISTS {}');
// print('sameTerm(?a, ?a)');
// print('?a IN (?a, ?a)');
// print('?a NOT IN (?a, ?a)');
// print('-?a');
// print('EXISTS {?a ?b ?c}');
// print('?a + str(<http://example.com>)')
// print('"aaaaaaa"')
// print('bound(?a)');
// print('isLiteral(?a)');
// print('COUNT(?a)')
// print('xsd:dateTime(?a)');
// print('-?a');
// print('(?a > ?b) = ?c')
// print('fn:not("a")');
// main();
