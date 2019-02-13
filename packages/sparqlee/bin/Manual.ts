#! /usr/bin/env node
// tslint:disable:no-console

import * as RDF from '@rdfjs/data-model';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { AsyncEvaluator } from '../lib/evaluators/AsyncEvaluator';
import { Bindings } from '../lib/Types';
import { TypeURL as DT } from '../lib/util/Consts';
import * as C from '../lib/util/Consts';
import * as UU from '../lib/util/Parsing';
import * as U from '../util/Util';
// import { Example, example1, mockLookUp, parse, parseFull } from '../util/Util';

function print(expr: string, full?: boolean): void {
  const parsedExpr = (full) ? U.parseFull(expr) : U.parse(expr);
  console.log(JSON.stringify(parsedExpr, null, 4));
}

async function testEval() {
  // const ex = new U.Example('DATATYPE(?r) = xsd:double && ?r >= 0.0 && ?r < 1.0', () => Bindings({
  //   '?r': RDF.literal('0.3', C.TypeURL.XSD_DOUBLE),
  // }));
  const ex = new U.Example('str("badlex"^^xsd:integer) = "badlex"', () => Bindings({
    '?r': RDF.literal('0.3', C.TypeURL.XSD_DOUBLE),
  }));
  // const ex = new U.Example('0.0');
  // tslint:disable-next-line:no-any
  const evaluator = new AsyncEvaluator(ex.expression, U.mockHooks);
  const presult = evaluator.evaluateAsInternal(ex.mapping()).catch((err) => console.log(err));
  const val = await presult;
  console.log(val);
  // console.log(val);
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
