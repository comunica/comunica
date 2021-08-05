import type * as RDF from 'rdf-js';
import type { Expression, SimpleApplication, SyncExtensionExpression } from './Expressions';
import { ExpressionType } from './Expressions';

export class SyncExtension implements SyncExtensionExpression {
  public expressionType: ExpressionType.SyncExtension = ExpressionType.SyncExtension;

  public constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: SimpleApplication,
  ) { }
}
