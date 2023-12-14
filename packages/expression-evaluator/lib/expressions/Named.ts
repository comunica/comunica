import type { FunctionApplication } from '@comunica/bus-functions';
import type * as RDF from '@rdfjs/types';

import type { Expression,
  NamedExpression } from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class Named implements NamedExpression {
  public expressionType: ExpressionType.Named = ExpressionType.Named;

  public constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: FunctionApplication,
  ) { }
}
