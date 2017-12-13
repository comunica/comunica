import { Parser, Expression, FilterPattern, Query } from 'sparqljs';
import { Literal, Term } from 'rdf-js';
import { Map } from 'immutable';

import { Bindings } from '../../core/Bindings';
import { SyncEvaluator } from '../../evaluators/SyncEvaluator';

const parser = new Parser({ 'xsd': 'http://www.w3.org/2001/XMLSchema#' });

export function createExpression(str: string): Expression {
    let sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + str + ') }') as Query;
    let expr = (sparql_query.where[1] as FilterPattern).expression;
    return expr;
}

export function evaluate(str: string, bindings = Bindings({})): boolean {
    let evaluator = new SyncEvaluator(createExpression(str));
    return evaluator.evaluate(bindings);
}