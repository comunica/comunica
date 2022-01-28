import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IAggregatorClass } from '../../aggregators';
import { aggregators } from '../../aggregators';
import type { BaseAggregator } from '../../aggregators/BaseAggregator';
import type { SetFunction } from '../../util/Consts';
import * as Err from '../../util/Errors';
import type { ICompleteSharedContext } from './BaseExpressionEvaluator';

export abstract class BaseAggregateEvaluator {
  protected expression: Algebra.AggregateExpression;
  protected aggregator: BaseAggregator<any>;
  protected throwError = false;
  protected state: any;

  protected constructor(expr: Algebra.AggregateExpression,
    sharedContext: ICompleteSharedContext, throwError?: boolean) {
    this.expression = expr;
    this.aggregator = new aggregators[<SetFunction> expr.aggregator](expr, sharedContext);
    this.throwError = throwError || false;
  }

  /**
   * The spec says to throw an error when a set function is called on an empty
   * set (unless explicitly mentioned otherwise like COUNT).
   * However, aggregate error handling says to not bind the result in case of an
   * error. So to simplify logic in the caller, we return undefined by default.
   *
   * @param throwError whether this function should respect the spec and throw an error if no empty value is defined
   */
  public static emptyValue(expr: Algebra.AggregateExpression, throwError = false): RDF.Term | undefined {
    const val = aggregators[<SetFunction> expr.aggregator].emptyValue();
    if (val === undefined && throwError) {
      throw new Err.EmptyAggregateError();
    }
    return val;
  }

  public result(): RDF.Term | undefined {
    return (<IAggregatorClass> this.aggregator.constructor).emptyValue();
  }

  /**
   * Put a binding from the result stream in the aggregate state.
   *
   * If any binding evaluation errors, the corresponding aggregate variable should be unbound.
   * If this happens, calling @see result() will return @constant undefined
   *
   * @param bindings the bindings to pass to the expression
   */
  abstract put(bindings: RDF.Bindings): void | Promise<void>;

  /**
   * The actual result method. When the first binding has been given, and the state
   * of the evaluators initialised. The .result API function will be replaced with this
   * function, which implements the behaviour we want.
   *
   * @param bindings the bindings to pass to the expression
   */
  protected __result(): RDF.Term {
    return this.aggregator.result(this.state);
  }

  /**
   * The actual put method. When the first binding has been given, and the state
   * of the evaluators initialised. The .put API function will be replaced with this
   * function, which implements the behaviour we want.
   *
   * @param bindings the bindings to pass to the expression
   */
  protected abstract __put(bindings: RDF.Bindings): void | Promise<void>;

  protected abstract safeThrow(err: unknown): void;
}
