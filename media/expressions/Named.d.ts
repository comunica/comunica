import type * as RDF from '@rdfjs/types';
import type { Expression, NamedExpression, SimpleApplication } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class Named implements NamedExpression {
    name: RDF.NamedNode;
    args: Expression[];
    apply: SimpleApplication;
    expressionType: ExpressionType.Named;
    constructor(name: RDF.NamedNode, args: Expression[], apply: SimpleApplication);
}
