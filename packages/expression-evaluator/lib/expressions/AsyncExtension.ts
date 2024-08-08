import type * as RDF from '@rdfjs/types';
import type { AsyncExtensionApplication, AsyncExtensionExpression, Expression } from './Expressions.js';
import { ExpressionType } from './Expressions.js';

export class AsyncExtension implements AsyncExtensionExpression {
  public expressionType: ExpressionType.AsyncExtension = ExpressionType.AsyncExtension;

  public constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: AsyncExtensionApplication,
  ) {}
}
