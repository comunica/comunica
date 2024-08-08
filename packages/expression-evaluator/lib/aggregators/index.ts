import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator.js';
import type { SetFunction } from '../util/Consts.js';
import type { AggregatorComponent } from './Aggregator.js';
import { Average } from './Average.js';
import { Count } from './Count.js';
import { GroupConcat } from './GroupConcat.js';
import { Max } from './Max.js';
import { Min } from './Min.js';
import { Sample } from './Sample.js';
import { Sum } from './Sum.js';

export interface IAggregatorComponentClass {
  new(expr: Algebra.AggregateExpression, sharedContext: ICompleteSharedContext): AggregatorComponent;
  emptyValue: (dataFactory: ComunicaDataFactory) => RDF.Term | undefined;
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
