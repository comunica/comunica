import { Parser, Expression, FilterPattern, Query } from 'sparqljs';
import { ExpressionEvaluator } from '../../evaluator/ExpressionEvaluator';
import { Literal } from 'rdf-data-model';

const parser = new Parser({ 'xsd': 'http://www.w3.org/2001/XMLSchema' });

export const errorTable = `
true  error = error
error true  = error
false error = error
error false = error
error error = error
`

export const errorTableUnary = `
error = error
`

export function createExpression(str: string): Expression {
    let sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + str + ') }') as Query;
    let expr = (sparql_query.where[1] as FilterPattern).expression;
    return expr;
}

export function evaluate(str: string, mappings = new Map()): Literal {
    let evaluator = new ExpressionEvaluator(createExpression(str));
    return evaluator.evaluate(mappings);
}