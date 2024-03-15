import type * as RDF from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';
import { aggregators } from '../../aggregators';
import { Aggregator } from '../../aggregators/Aggregator';
import { WildcardCountAggregator } from '../../aggregators/WildcardCountAggregator';
import type { SetFunction } from '../../util/Consts';
import * as Err from '../../util/Errors';
import type { ICompleteSharedContext } from './BaseExpressionEvaluator';

export abstract class BaseAggregateEvaluator {
  protected expression: Algebra.AggregateExpression;
  protected aggregator: Aggregator;
  protected throwError = false;
  protected isWildcard = false;
  protected wildcardAggregator: WildcardCountAggregator | undefined;
  protected errorOccurred = false;

  protected constructor(expr: Algebra.AggregateExpression,
    sharedContext: ICompleteSharedContext, throwError?: boolean) {
    this.expression = expr;
    this.aggregator = new Aggregator(expr, new aggregators[<SetFunction> expr.aggregator](expr, sharedContext));
    this.throwError = throwError || false;
    this.isWildcard = expr.expression.expressionType === Algebra.expressionTypes.WILDCARD;
    if (this.isWildcard) {
      this.wildcardAggregator = new WildcardCountAggregator(expr);
    }
  }

  /**
   * The spec says to throw an error when a set function is called on an empty
   * set (unless explicitly mentioned otherwise like COUNT).
   * However, aggregate error handling says to not bind the result in case of an
   * error. So to simplify logic in the caller, we return undefined by default.
   *
   * @param expr the aggregate expression
   * @param throwError whether this function should respect the spec and throw an error if no empty value is defined
   */
  public static emptyValue(expr: Algebra.AggregateExpression, throwError = false): RDF.Term | undefined {
    let val: RDF.Term | undefined;
    if (expr.expression.expressionType === Algebra.expressionTypes.WILDCARD) {
      val = WildcardCountAggregator.emptyValue();
    } else {
      val = Aggregator.emptyValue(aggregators[<SetFunction> expr.aggregator]);
    }
    if (val === undefined && throwError) {
      throw new Err.EmptyAggregateError();
    }
    return val;
  }

  public result(): RDF.Term | undefined {
    if (this.errorOccurred) {
      return undefined;
    }
    if (this.isWildcard) {
      return this.wildcardAggregator!.result();
    }
    return this.aggregator.result();
  }

  /**
   * Put a binding from the result stream in the aggregate state.
   *
   * If any binding evaluation errors, the corresponding aggregate variable should be unbound.
   * If this happens, calling @see result() will return @constant undefined
   *
   * @param bindings the bindings to pass to the expression
   */
  public abstract put(bindings: RDF.Bindings): void | Promise<void>;

  protected abstract safeThrow(err: unknown): void;
}
