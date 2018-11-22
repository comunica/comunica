import * as RDF from 'rdf-js';

import {
  Expression,
  ExpressionType,
  NamedExpression,
  SimpleApplication,
} from './Expressions';

export class Named implements NamedExpression {
  expressionType: ExpressionType.Named = ExpressionType.Named;

  constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public apply: SimpleApplication) { }
}
