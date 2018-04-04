import { Map } from 'immutable';
import { Literal, Term } from 'rdf-js';
import { Expression, FilterPattern, Parser, Query } from 'sparqljs';

import { Bindings } from '../../core/FilteredStreams';
import { SyncEvaluator } from '../../sync/SyncEvaluator';

const parser = new Parser({ xsd: 'http://www.w3.org/2001/XMLSchema#' });

export function createExpression(str: string): Expression {
  const sparqlQuery = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + str + ') }') as Query;
  const expr = (sparqlQuery.where[1] as FilterPattern).expression;
  return expr;
}

export function evaluate(str: string, bindings = Bindings({})): boolean {
  const evaluator = new SyncEvaluator(createExpression(str));
  return evaluator.evaluate(bindings);
}
