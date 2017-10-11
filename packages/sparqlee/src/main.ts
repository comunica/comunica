import { Parser, FilterPattern, Query} from 'sparqljs'

import { ExpressionEvaluator } from './evaluator/ExpressionEvaluator';
import { Mapping } from './core/Mapping'
import { RDFNamedNode, RDFLiteral, RDFVariable } from './core/RDFTerm';

var parser = new Parser({'xsd': 'http://www.w3.org/2001/XMLSchema'})
var expression_string = '((?age + ?otherAge) = 40) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)'
var sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + expression_string + ') }') as Query;
var expr_example = (sparql_query.where[1] as FilterPattern).expression;

var evaluator = new ExpressionEvaluator(expr_example);
evaluator.evaluate(new Map([
    ['age', new RDFLiteral('20')],
    ['otherAge', new RDFLiteral('20')],
    ['joinYear', new RDFLiteral('2007-03-03T00:00:00Z')]
]));