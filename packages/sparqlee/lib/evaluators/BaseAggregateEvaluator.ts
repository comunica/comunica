import {Algebra} from 'sparqlalgebrajs';
import {AggregatorClass, aggregators, BaseAggregator} from '../Aggregators';
import {SetFunction} from '../util/Consts';
import * as RDF from 'rdf-js';
import * as Err from '../util/Errors';
import {Bindings} from '../Types';

export abstract class BaseAggregateEvaluator {

  protected expression: Algebra.AggregateExpression;
  protected aggregator: BaseAggregator<any>;
  protected throwError = false;
  protected state: any;

  protected constructor(expr: Algebra.AggregateExpression, throwError?: boolean) {
    this.expression = expr;
    this.aggregator = new aggregators[expr.aggregator as SetFunction](expr);
    this.throwError = throwError;
  }

  /**
   * The spec says to throw an error when a set function is called on an empty
   * set (unless explicitly mentioned otherwise like COUNT).
   * However, aggregate error handling says to not bind the result in case of an
   * error. So to simplify logic in the caller, we return undefined by default.
   *
   * @param throwError whether this function should respect the spec and throw an error if no empty value is defined
   */
  static emptyValue(expr: Algebra.AggregateExpression, throwError = false): RDF.Term {
    const val = aggregators[expr.aggregator as SetFunction].emptyValue();
    if (val === undefined && throwError) {
      throw new Err.EmptyAggregateError();
    }
    return val;
  }

  result(): RDF.Term {
    return (this.aggregator.constructor as AggregatorClass).emptyValue();
  }

  /**
   * Put a binding from the result stream in the aggregate state.
   *
   * If any binding evaluation errors, the corresponding aggregate variable should be unbound.
   * If this happens, calling @see result() will return @constant undefined
   *
   * @param bindings the bindings to pass to the expression
   */
  abstract put(bindings: Bindings): void | Promise<void>;

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
  protected abstract __put(bindings: Bindings): void | Promise<void>;

  protected abstract safeThrow(err: Error): void;
}
