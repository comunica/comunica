import { Parser, FilterPattern, Query, OperationExpression, Term, Expression, BaseExpression} from 'sparqljs'

import { ExpressionEvaluator } from '../src/evaluator/ExpressionEvaluator';
import { Mapping } from '../src/core/Mapping'
import { RDFNamedNode, RDFLiteral, RDFVariable } from '../src/core/RDFTerm';
import { Suite } from 'benchmark';

var parser = new Parser({'xsd': 'http://www.w3.org/2001/XMLSchema'})
var expression_string = '((?age + ?otherAge) = 40) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)'
var sparql_query = parser.parse('SELECT * WHERE { ?s ?p ?o  FILTER (' + expression_string + ') }') as Query;
var expr_example = (sparql_query.where[1] as FilterPattern).expression;

var evaluator = new ExpressionEvaluator(expr_example);
var mapping = new Map([
    ['age', new RDFLiteral('20')],
    ['otherAge', new RDFLiteral('20')],
    ['joinYear', new RDFLiteral('2007-03-03T00:00:00Z')]
])
console.log(expr_example);

function evaluate(expr: Expression): any {
    // Term
    if (typeof expr == 'string'){
        console.log(expr, expr.__termBrand)
        return expr;
    };

    // Operation
    expr = expr as OperationExpression;
    var left = evaluate(expr.args[0]);
    var right = evaluate(expr.args[1]);
    switch (expr.operator) {
        case '=': {
            console.log(left == right);
            return left == right;
        }
        case '>': {
            return left > right;
        }
        case '&&': {
            return left && right;
        }
        case '+': {
            return left + right;
        }
    }
}

var suite = new Suite();
suite
.add('ExpressionByHand', () => {
    var expression = expr_example as OperationExpression;
    /*
    var evalSum = (expr: OperationExpression) => {
        var leftArg = mapping.get(expr.args[0] as Term);
        var rightArg = mapping.get(expr.args[0] as Term);
        //return leftArg.value + rightArg.value;
    }
    
    var evalLeft = (expr: OperationExpression) => {

        var leftArg = evalSum(expr.args[0] as OperationExpression)
        console.log(expr.args[1])
        var rightArg = mapping.get(expr.args[1] as Term)
        console.log(leftArg, rightArg);
        return expr.args[0] == expr.args[1];

    }
    var evalRight = (expr: OperationExpression) => {
        return expr.args[0] == expr.args[1];
    }

    var left = expression.args[0];
    var right = expression.args[1];*/
    var result = evaluate(expression);
    console.log(result);
    return result;

    //return evalLeft(left as OperationExpression) &&
      //     evalRight(right as OperationExpression);
})
.on('cycle', function(event: Event) {
    console.log(String(event.target));
})
.run();