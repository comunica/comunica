import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type * as E from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import type { ITermTransformer } from '../transformers/TermTransformer';
import { TypeAlias } from '../util/Consts';
import { isSubTypeOf } from '../util/TypeHandling';
import type { IAggregatorComponentClass } from '.';

export abstract class AggregatorComponent {
  public abstract putTerm(bindings: RDF.Term): void;
  public putBindings(bindings: RDF.Bindings): void {

  }
  public abstract result(): RDF.Term | undefined;

  protected separator: string;
  protected termTransformer: ITermTransformer;

  public static emptyValue(): RDF.Term | undefined {
    return undefined;
  }

  public constructor(expr: Algebra.AggregateExpression, protected sharedContext: ICompleteSharedContext) {
    this.separator = expr.separator || ' ';
    this.termTransformer = new TermTransformer(sharedContext.superTypeProvider);
  }


}
