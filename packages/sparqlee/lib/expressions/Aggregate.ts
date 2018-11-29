import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { AggregateHook } from './../Types';
import {
  AggregateExpression,
  ExpressionType,
} from './Expressions';

export class Aggregate implements AggregateExpression {
  expressionType: ExpressionType.Aggregate = ExpressionType.Aggregate;

  constructor(
    public name: string,
    public aggregator: AggregateHook,
    public expression: Alg.AggregateExpression,
  ) { }

  aggregate(): Promise<RDF.Term> {
    return this.aggregator(this.expression);
  }
}
