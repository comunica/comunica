import type { IBindingsAggregator, IExpressionEvaluator, IExtensionAggregator } from '@comunica/types';
import { UnboundVariableError } from '@comunica/utils-expression-evaluator';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';

/**
 * Aggregates bindings with an extension aggregate.
 * Evaluates the arguments of the aggregate call, handles DISTINCT and errors like the built-in aggregates do,
 * and puts the evaluated arguments into the extension aggregator.
 */
export class NamedAggregator implements IBindingsAggregator {
  private readonly putArguments = new Set<string>();
  private errorOccurred = false;

  public constructor(
    private readonly evaluators: IExpressionEvaluator[],
    private readonly distinct: boolean,
    private readonly aggregator: IExtensionAggregator,
  ) {}

  public async putBindings(bindings: RDF.Bindings): Promise<void> {
    if (this.errorOccurred) {
      return;
    }
    try {
      const args = await Promise.all(this.evaluators.map(evaluator => evaluator.evaluate(bindings)));
      if (this.distinct) {
        const key = JSON.stringify(args.map(arg => termToString(arg)));
        if (this.putArguments.has(key)) {
          return;
        }
        this.putArguments.add(key);
      }
      await this.aggregator.put(args);
    } catch (error: unknown) {
      // Like built-in aggregates, solutions that have no value for a variable of the arguments are skipped.
      if (!(error instanceof UnboundVariableError)) {
        this.errorOccurred = true;
      }
    }
  }

  public async result(): Promise<RDF.Term | undefined> {
    if (this.errorOccurred) {
      return undefined;
    }
    try {
      return await this.aggregator.result();
    } catch {
      return undefined;
    }
  }
}
