import { Parser, FilterPattern, Query, OperationExpression, Term, Expression, BaseExpression} from 'sparqljs'
import { Suite } from 'benchmark';
import * as RDF from 'rdf-data-model';
import fromString from 'termterm.js'

import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping'

var parser = new Parser({'xsd': 'http://www.w3.org/2001/XMLSchema'})
var expression_string = '((?age + ?otherAge) = "40"^^xsd:integer) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)'
var sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + expression_string + ') }') as Query;
var expr_example = (sparql_query.where[1] as FilterPattern).expression;

var evaluator = new ExpressionEvaluator(expr_example);

var mapping = new Map([
    ['age', RDF.literal('20')],
    ['otherAge', RDF.literal('20')],
    ['joinYear', RDF.literal('2007-03-03T00:00:00Z')]
])

console.log(expr_example);

function evaluate(expr: Expression): any {
    // Term
    if (typeof expr == 'string'){
        var term = fromString(expr)
        switch (term.termType) {
            case 'Variable': {
                return Number(mapping.get(term.value));
            }
            case 'Literal': {
                return Number(term.value);
            }
        }
    
    // Operation
    } else {
        expr = expr as OperationExpression;
        var left = evaluate(expr.args[0]);
        var right = evaluate(expr.args[1]);
        switch (expr.operator) {
            case '=': {
                return (left as number) == (right as number);
            }
            case '>': {
                return new Date(left) > new Date(right);
            }
            case '&&': {
                return left && right;
            }
            case '+': {
                return Number(left) + Number(right);
            }
        }
    }
}

var suite = new Suite();
suite
.add('ExpressionByHand', () => {
    var expression = expr_example as OperationExpression;
    evaluate(expression);
})
.on('cycle', function(event: Event) {
    console.log(String(event.target));
})
.run();