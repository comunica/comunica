import { Algebra as Alg } from 'sparqlalgebrajs';

import { Bindings, ExistenceHook } from './../Types';
import {
  ExistenceExpression,
  ExpressionType,
} from './Expressions';

export class Existence implements ExistenceExpression {
  expressionType: ExpressionType.Existence = ExpressionType.Existence;

  constructor(
    public exists: ExistenceHook,
    public expression: Alg.ExistenceExpression,
  ) { }

  exists_with(mapping: Bindings): Promise<boolean> {
    return this.exists(this.expression, mapping);
  }
}
