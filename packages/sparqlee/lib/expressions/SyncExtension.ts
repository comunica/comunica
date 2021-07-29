import {Expression, ExpressionType, NamedExpression, SimpleApplication, SyncExtensionExpression} from './Expressions';
import * as RDF from 'rdf-js';

export class SyncExtension implements SyncExtensionExpression {
  expressionType: ExpressionType.SyncExtension = ExpressionType.SyncExtension;

  constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: SimpleApplication) { }
}
