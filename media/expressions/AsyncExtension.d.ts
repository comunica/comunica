import type * as RDF from '@rdfjs/types';
import type { AsyncExtensionApplication, AsyncExtensionExpression, Expression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class AsyncExtension implements AsyncExtensionExpression {
    name: RDF.NamedNode;
    args: Expression[];
    apply: AsyncExtensionApplication;
    expressionType: ExpressionType.AsyncExtension;
    constructor(name: RDF.NamedNode, args: Expression[], apply: AsyncExtensionApplication);
}
