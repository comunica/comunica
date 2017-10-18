import { Parser, Expression, FilterPattern } from 'sparqljs';
import { ExpressionEvaluator } from '../../evaluator/ExpressionEvaluator';
import { Literal } from 'rdf-data-model';

const parser = new Parser({ 'xsd': 'http://www.w3.org/2001/XMLSchema' });

export function create_expression(str: string): Expression {
    let sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + str + ') }') as Query;
    let expr = (sparql_query.where[1] as FilterPattern).expression;
    return expr;
}

export function evaluation_for(str: string, mappings = new Map()): Literal {
    let evaluator = new ExpressionEvaluator(create_expression(str));
    return evaluator.evaluate(mappings);
}