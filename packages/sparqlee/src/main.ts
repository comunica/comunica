import { ExpressionEvaluator } from './evaluator/ExpressionEvaluator';
import { Expression, Literal, NamedNode, Operator, Term, Variable } from './core/Expression';
import { Mapping } from './core/Mapping'
import * as sparql from 'sparqljs'

import { 
    RDFTerm,
    RDFTermTypes,
    RDFNamedNode,
    RDFBlankNode, 
    RDFLiteral,
    RDFVariable,
    RDFDefaultGraph
} from './core/RDFTerm';

var example = new Operator(
    '&&', 
    [
        new Operator(
            '>',
            [
                new Variable('joinYear'),
                new Literal('2005-01-01T00:00:00Z', undefined, new NamedNode('xsd:dateTime'))
            ]
        ), 
        new Operator(
            '=',
            [
                new Literal('40', undefined, new NamedNode('xsd:integer')),
                new Operator(
                    '+',
                    [
                        new Variable('age'),
                        new Variable('otherAge')
                    ]
                )
            ]
        )
    ]
);

var evaluator = new ExpressionEvaluator(example);
evaluator.evaluate(new Map([
    ['age', new RDFLiteral('20')],
    ['otherAge', new RDFLiteral('20')],
    ['joinYear', new RDFLiteral('2007-03-03T00:00:00Z')]
]));

var parser = new sparql.Parser({'xsd': 'http://www.w3.org/2001/XMLSchema'})
var expression_string = '((?age + ?otherAge) = 40) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)'
var sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + expression_string + ') }') as sparql.Query;
var filter_expr = (sparql_query.where[1] as sparql.FilterPattern).expression;
console.log(filter_expr);