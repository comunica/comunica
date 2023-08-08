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
  public abstract put(bindings: RDF.Term | undefined): void;
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

  protected termToNumericOrError(term: RDF.Term): E.NumericLiteral {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !isSubTypeOf(term.datatype.value, TypeAlias.SPARQL_NUMERIC, this.sharedContext.superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> this.termTransformer.transformLiteral(term);
  }
}

/**
 * A base aggregator that can handle distinct and possibly wildcards.
 */
export class Aggregator {
  protected distinct: boolean;
  protected variableValues: Map<string, Set<string>> = new Map();

  public constructor(expr: Algebra.AggregateExpression, protected aggregatorComponent: AggregatorComponent) {
    this.distinct = expr.distinct;
  }

  public static emptyValue(component: IAggregatorComponentClass): RDF.Term | undefined {
    return component.emptyValue();
  }

  public result(): RDF.Term | undefined {
    return this.aggregatorComponent.result();
  }

  public put(bindings: RDF.Term, variable = ''): void {
    if (!this.canSkip(bindings, variable)) {
      this.aggregatorComponent.put(bindings);
      this.addSeen(bindings, variable);
    }
  }

  private canSkip(term: RDF.Term, variable: string): boolean {
    const set = this.variableValues.get(variable);
    return this.distinct && !!set && set.has(RdfString.termToString(term));
  }

  private addSeen(term: RDF.Term, variable: string): void {
    if (this.distinct) {
      if (!this.variableValues.has(variable)) {
        this.variableValues.set(variable, new Set());
      }
      this.variableValues.get(variable)!.add(RdfString.termToString(term));
    }
  }
}

