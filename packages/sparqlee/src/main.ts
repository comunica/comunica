import { ExpressionEvaluator } from './evaluator/ExpressionEvaluator';
import { Expression, Operator, ExpTerm } from './core/Expression';
import { 
    Term,
    TermTypes,
    NamedNode,
    BlankNode, 
    Literal,
    Variable,
    DefaultGraph
} from './core/Term';

var example = new Operator(
    '&&', 
    [new ExpTerm(new Variable('a')), new ExpTerm( new Variable('b'))]
);

var evaluator = new ExpressionEvaluator(example);
evaluator.evaluate(new Map());