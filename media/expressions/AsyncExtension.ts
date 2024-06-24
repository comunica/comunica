import type * as RDF from '@rdfjs/types';
import type { AsyncExtensionApplication, AsyncExtensionExpression, Expression } from './Expressions';
import { ExpressionType } from './Expressions';

export class AsyncExtension implements AsyncExtensionExpression {
  public expressionType: ExpressionType.AsyncExtension = ExpressionType.AsyncExtension;

  public constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: AsyncExtensionApplication,
  ) {}
}
