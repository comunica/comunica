import type * as RDF from '@rdfjs/types';
import type { Expression, SimpleApplication, SyncExtensionExpression } from './Expressions';
import { ExpressionType } from './Expressions';
export declare class SyncExtension implements SyncExtensionExpression {
    name: RDF.NamedNode;
    args: Expression[];
    apply: SimpleApplication;
    expressionType: ExpressionType.SyncExtension;
    constructor(name: RDF.NamedNode, args: Expression[], apply: SimpleApplication);
}
