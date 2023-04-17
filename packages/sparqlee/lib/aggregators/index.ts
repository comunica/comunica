import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type { SetFunction } from '../util/Consts';
import type { AggregatorComponent } from './Aggregator';
import { Average } from './Average';
import { Count } from './Count';
import { GroupConcat } from './GroupConcat';
import { Max } from './Max';
import { Min } from './Min';
import { Sample } from './Sample';
import { Sum } from './Sum';

export interface IAggregatorComponentClass {
  new(expr: Algebra.AggregateExpression, sharedContext: ICompleteSharedContext): AggregatorComponent;
  emptyValue: () => RDF.Term | undefined;
}

export const aggregators: Readonly<{[key in SetFunction]: IAggregatorComponentClass }> = {
  count: Count,
  sum: Sum,
  min: Min,
  max: Max,
  avg: Average,
  group_concat: GroupConcat,
  sample: Sample,
};
