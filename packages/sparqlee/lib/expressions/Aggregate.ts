import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { Bindings } from './../Types';
import {
  AggregateExpression,
  ExpressionType,
} from './Expressions';

export class Aggregate implements AggregateExpression {
  expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  constructor(
    public name: string,
    public distinct: boolean,
    public expression: Alg.Expression,
    public aggregator: (distinct: boolean, expression: Alg.Expression, separator?: string) => Promise<RDF.Term>,
    public separator?: string,
  ) { }

  aggregate(_mapping: Bindings): Promise<RDF.Term> {
    return this.aggregator(this.distinct, this.expression, this.separator);
  }
}
