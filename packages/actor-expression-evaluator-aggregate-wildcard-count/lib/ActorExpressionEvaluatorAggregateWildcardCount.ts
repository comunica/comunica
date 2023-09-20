import type {
  IActionExpressionEvaluatorAggregate,
  IActorExpressionEvaluatorAggregateOutput,
  IActorExpressionEvaluatorAggregateArgs,
} from '@comunica/bus-expression-evaluator-aggregate';
import { ActorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActorTest } from '@comunica/core';
import type { ExpressionEvaluator } from '@comunica/expression-evaluator';
import { AggregateEvaluator } from '@comunica/expression-evaluator';
import { integer } from '@comunica/expression-evaluator/lib/functions/Helpers';
import type * as RDF from '@rdfjs/types';
import * as RdfString from 'rdf-string';

/**
 * A comunica Wildcard Count Expression Evaluator Aggregate Actor.
 */
export class ActorExpressionEvaluatorAggregateWildcardCount extends ActorExpressionEvaluatorAggregate {
  public constructor(args: IActorExpressionEvaluatorAggregateArgs) {
    super(args);
  }

  public async test(action: IActionExpressionEvaluatorAggregate): Promise<IActorTest> {
    if (action.expr.aggregator !== 'count' || action.expr.expression.expressionType !== 'wildcard') {
      throw new Error('This actor only supports the \'count\' aggregator with wildcard.');
    }
    return {};
  }

  public async run(action: IActionExpressionEvaluatorAggregate): Promise<IActorExpressionEvaluatorAggregateOutput> {
    return {
      aggregator: new WildcardCountAggregator(action.factory.createEvaluator(action.expr, action.context)),
    };
  }
}

class WildcardCountAggregator extends AggregateEvaluator {
  // Key: string representation of a ',' separated list of terms.
  // Value: string representation of a ',' separated list of variables sorted by name.
  private readonly bindingValues: Map<string, Set<string>> = new Map();
  private counter = 0;

  public constructor(evaluator: ExpressionEvaluator, throwError?: boolean) {
    super(evaluator, throwError);
  }

  public putTerm(term: RDF.Term): void {
    // Do nothing, not needed
  }

  public async putBindings(bindings: RDF.Bindings): Promise<void> {
    if (!this.handleDistinct(bindings)) {
      this.counter += 1;
    }
  }

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public termResult(): RDF.Term {
    return integer(this.counter).toRDF();
  }

  /**
   * Returns true if the given bindings should be skipped.
   * @param bindings
   * @private
   */
  private handleDistinct(bindings: RDF.Bindings): boolean {
    if (this.distinct) {
      const bindingList: [RDF.Variable, RDF.Term][] = [ ...bindings ];
      bindingList.sort((first, snd) => first[0].value.localeCompare(snd[0].value));
      const variables = bindingList.map(([ variable ]) => variable.value).join(',');
      const terms = bindingList.map(([ , term ]) => RdfString.termToString(term)).join(',');

      const set = this.bindingValues.get(variables);
      const result = set !== undefined && set.has(terms);

      // Add to the set:
      if (!set) {
        this.bindingValues.set(variables, new Set());
      }
      this.bindingValues.get(variables)!.add(terms);

      return result;
    }
    return false;
  }
}
