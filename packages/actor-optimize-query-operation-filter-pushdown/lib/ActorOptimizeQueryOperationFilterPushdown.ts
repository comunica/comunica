import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationArgs,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { uniqTerms } from 'rdf-terms';
import type { Factory } from 'sparqlalgebrajs';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * A comunica Filter Pushdown Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationFilterPushdown extends ActorOptimizeQueryOperation {
  private readonly maxIterations: number;
  private readonly splitConjunctive: boolean;
  private readonly mergeConjunctive: boolean;
  private readonly pushIntoLeftJoins: boolean;

  public constructor(args: IActorOptimizeQueryOperationFilterPushdownArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    let operation: Algebra.Operation = action.operation;
    // eslint-disable-next-line ts/no-this-alias
    const self = this;

    // Split conjunctive filters into nested filters
    if (this.splitConjunctive) {
      operation = Util.mapOperation(operation, {
        filter(op: Algebra.Filter, factory: Factory) {
          // Split conjunctive filters into separate filters
          if (op.expression.expressionType === Algebra.expressionTypes.OPERATOR && op.expression.operator === '&&') {
            self.logDebug(action.context, `Split conjunctive filter into ${op.expression.args.length} nested filters`);
            return {
              recurse: true,
              result: op.expression.args
                .reduce((operation, expression) => factory.createFilter(operation, expression), op.input),
            };
          }
          return {
            recurse: true,
            result: op,
          };
        },
      });
    }

    // Push down all filters
    // We loop until no more filters can be pushed down.
    let repeat = true;
    let iterations = 0;
    while (repeat && iterations < this.maxIterations) {
      repeat = false;
      operation = Util.mapOperation(operation, {
        filter(op: Algebra.Filter, factory: Factory) {
          // For all filter expressions in the operation,
          // we attempt to push them down as deep as possible into the algebra.
          const variables = self.getExpressionVariables(op.expression);
          const [ isModified, result ] = self
            .filterPushdown(op.expression, variables, op.input, factory, action.context);
          if (isModified) {
            repeat = true;
          }
          return {
            recurse: true,
            result,
          };
        },
      });
      iterations++;
    }

    if (iterations > 1) {
      self.logDebug(action.context, `Pushed down filters in ${iterations} iterations`);
    }

    // Merge nested filters into conjunctive filters
    if (this.mergeConjunctive) {
      operation = Util.mapOperation(operation, {
        filter(op: Algebra.Filter, factory: Factory) {
          if (op.input.type === Algebra.types.FILTER) {
            const { nestedExpressions, input } = self.getNestedFilterExpressions(op);
            self.logDebug(action.context, `Merge ${nestedExpressions.length} nested filters into conjunctive filter`);
            return {
              recurse: true,
              result: factory.createFilter(
                input,
                nestedExpressions.slice(1).reduce((previous, current) =>
                  factory.createOperatorExpression('&&', [ previous, current ]), nestedExpressions[0]),
              ),
            };
          }
          return {
            recurse: true,
            result: op,
          };
        },
      });
    }

    return { operation, context: action.context };
  }

  /**
   * Get all variables inside the given expression.
   * @param expression An expression.
   * @return An array of variables, or undefined if the expression is unsupported for pushdown.
   */
  public getExpressionVariables(expression: Algebra.Expression): RDF.Variable[] {
    switch (expression.expressionType) {
      case Algebra.expressionTypes.AGGREGATE:
      case Algebra.expressionTypes.WILDCARD:
        throw new Error(`Getting expression variables is not supported for ${expression.expressionType}`);
      case Algebra.expressionTypes.EXISTENCE:
        return Util.inScopeVariables(expression.input);
      case Algebra.expressionTypes.NAMED:
        return [];
      case Algebra.expressionTypes.OPERATOR:
        return uniqTerms(expression.args.flatMap(arg => this.getExpressionVariables(arg)));
      case Algebra.expressionTypes.TERM:
        if (expression.term.termType === 'Variable') {
          return [ expression.term ];
        }
        return [];
    }
  }

  protected getOverlappingOperations(
    operation: Algebra.Operation,
    expressionVariables: RDF.Variable[],
  ): {
      fullyOverlapping: Algebra.Operation[];
      partiallyOverlapping: Algebra.Operation[];
      notOverlapping: Algebra.Operation[];
    } {
    const fullyOverlapping: Algebra.Operation[] = [];
    const partiallyOverlapping: Algebra.Operation[] = [];
    const notOverlapping: Algebra.Operation[] = [];
    for (const input of operation.input) {
      const inputVariables = Util.inScopeVariables(input);
      if (this.variablesSubSetOf(expressionVariables, inputVariables)) {
        fullyOverlapping.push(input);
      } else if (this.variablesIntersect(expressionVariables, inputVariables)) {
        partiallyOverlapping.push(input);
      } else {
        notOverlapping.push(input);
      }
    }

    return {
      fullyOverlapping,
      partiallyOverlapping,
      notOverlapping,
    };
  }

  /**
   * Recursively push down the given expression into the given operation if possible.
   * Different operators have different semantics for choosing whether or not to push down,
   * and how this pushdown is done.
   * For every passed operator, it is checked whether or not the filter will have any effect on the operation.
   * If not, the filter is voided.
   * @param expression An expression to push down.
   * @param expressionVariables The variables inside the given expression.
   * @param operation The operation to push down into.
   * @param factory An algebra factory.
   * @param context The action context.
   * @return A tuple indicating if the operation was modified and the modified operation.
   */
  public filterPushdown(
    expression: Algebra.Expression,
    expressionVariables: RDF.Variable[],
    operation: Algebra.Operation,
    factory: Factory,
    context: IActionContext,
  ): [ boolean, Algebra.Operation ] {
    // Void false expressions
    if (this.isExpressionFalse(expression)) {
      return [ true, factory.createUnion([]) ];
    }

    // Don't push down (NOT) EXISTS
    if (expression.type === Algebra.types.EXPRESSION &&
      expression.expressionType === Algebra.expressionTypes.EXISTENCE) {
      return [ false, factory.createFilter(operation, expression) ];
    }

    switch (operation.type) {
      case Algebra.types.EXTEND:
        // Pass if the variable is not part of the expression
        if (!this.variablesIntersect([ operation.variable ], expressionVariables)) {
          return [ true, factory.createExtend(
            this.filterPushdown(expression, expressionVariables, operation.input, factory, context)[1],
            operation.variable,
            operation.expression,
          ) ];
        }
        return [ false, factory.createFilter(operation, expression) ];
      case Algebra.types.FILTER: {
        // Always pass
        const [ isModified, result ] = this
          .filterPushdown(expression, expressionVariables, operation.input, factory, context);
        return [ isModified, factory.createFilter(result, operation.expression) ];
      }
      case Algebra.types.JOIN: {
        // Don't push down for empty join
        if (operation.input.length === 0) {
          return [ false, factory.createFilter(operation, expression) ];
        }

        // Determine overlapping operations
        const {
          fullyOverlapping,
          partiallyOverlapping,
          notOverlapping,
        } = this.getOverlappingOperations(operation, expressionVariables);

        const joins: Algebra.Operation[] = [];
        let isModified = false;
        if (fullyOverlapping.length > 0) {
          isModified = true;
          joins.push(factory.createJoin(fullyOverlapping
            .map(input => this.filterPushdown(expression, expressionVariables, input, factory, context)[1])));
        }
        if (partiallyOverlapping.length > 0) {
          joins.push(factory.createFilter(factory.createJoin(partiallyOverlapping, false), expression));
        }
        if (notOverlapping.length > 0) {
          joins.push(...notOverlapping);
        }

        if (joins.length > 1) {
          isModified = true;
        }

        if (isModified) {
          this.logDebug(context, `Push down filter across join entries with ${fullyOverlapping.length} fully overlapping, ${partiallyOverlapping.length} partially overlapping, and ${notOverlapping.length} not overlapping`);
        }

        return [ isModified, joins.length === 1 ? joins[0] : factory.createJoin(joins) ];
      }
      case Algebra.types.NOP:
        return [ true, operation ];
      case Algebra.types.PROJECT:
        // Push down if variables overlap
        if (this.variablesIntersect(operation.variables, expressionVariables)) {
          return [ true, factory.createProject(
            this.filterPushdown(expression, expressionVariables, operation.input, factory, context)[1],
            operation.variables,
          ) ];
        }
        // Void expression otherwise
        return [ true, operation ];
      case Algebra.types.UNION: {
        // Determine overlapping operations
        const {
          fullyOverlapping,
          partiallyOverlapping,
          notOverlapping,
        } = this.getOverlappingOperations(operation, expressionVariables);

        const unions: Algebra.Operation[] = [];
        let isModified = false;
        if (fullyOverlapping.length > 0) {
          isModified = true;
          unions.push(factory.createUnion(fullyOverlapping
            .map(input => this.filterPushdown(expression, expressionVariables, input, factory, context)[1])));
        }
        if (partiallyOverlapping.length > 0) {
          unions.push(factory.createFilter(factory.createUnion(partiallyOverlapping, false), expression));
        }
        if (notOverlapping.length > 0) {
          unions.push(...notOverlapping);
        }

        if (unions.length > 1) {
          isModified = true;
        }

        if (isModified) {
          this.logDebug(context, `Push down filter across union entries with ${fullyOverlapping.length} fully overlapping, ${partiallyOverlapping.length} partially overlapping, and ${notOverlapping.length} not overlapping`);
        }

        return [ isModified, unions.length === 1 ? unions[0] : factory.createUnion(unions) ];
      }
      case Algebra.types.VALUES:
        // Only keep filter if it overlaps with the variables
        if (this.variablesIntersect(operation.variables, expressionVariables)) {
          return [ false, factory.createFilter(operation, expression) ];
        }
        return [ true, operation ];
      case Algebra.types.LEFT_JOIN: {
        if (this.pushIntoLeftJoins) {
          const rightVariables = Util.inScopeVariables(operation.input[1]);
          if (!this.variablesIntersect(expressionVariables, rightVariables)) {
            // If filter *only* applies to left entry of optional, push it down into that.
            this.logDebug(context, `Push down filter into left join`);
            return [ true, factory.createLeftJoin(
              this.filterPushdown(expression, expressionVariables, operation.input[0], factory, context)[1],
              operation.input[1],
              operation.expression,
            ) ];
          }
        }

        // Don't push down in all other cases
        return [ false, factory.createFilter(operation, expression) ];
      }
      case Algebra.types.MINUS:
      case Algebra.types.ALT:
      case Algebra.types.ASK:
      case Algebra.types.BGP:
      case Algebra.types.CONSTRUCT:
      case Algebra.types.DESCRIBE:
      case Algebra.types.DISTINCT:
      case Algebra.types.EXPRESSION:
      case Algebra.types.FROM:
      case Algebra.types.GRAPH:
      case Algebra.types.GROUP:
      case Algebra.types.INV:
      case Algebra.types.LINK:
      case Algebra.types.NPS:
      case Algebra.types.ONE_OR_MORE_PATH:
      case Algebra.types.ORDER_BY:
      case Algebra.types.PATTERN:
      case Algebra.types.REDUCED:
      case Algebra.types.SEQ:
      case Algebra.types.SERVICE:
      case Algebra.types.SLICE:
      case Algebra.types.PATH:
      case Algebra.types.ZERO_OR_MORE_PATH:
      case Algebra.types.ZERO_OR_ONE_PATH:
      case Algebra.types.COMPOSITE_UPDATE:
      case Algebra.types.DELETE_INSERT:
      case Algebra.types.LOAD:
      case Algebra.types.CLEAR:
      case Algebra.types.CREATE:
      case Algebra.types.DROP:
      case Algebra.types.ADD:
      case Algebra.types.MOVE:
      case Algebra.types.COPY:
        // Operations that do not support pushing down
        // Left-join and minus might be possible to support in the future.
        return [ false, factory.createFilter(operation, expression) ];
    }
  }

  /**
   * Check if there is an overlap between the two given lists of variables.
   * @param varsA A list of variables.
   * @param varsB A list of variables.
   */
  public variablesIntersect(varsA: RDF.Variable[], varsB: RDF.Variable[]): boolean {
    return varsA.some(varA => varsB.some(varB => varA.equals(varB)));
  }

  /**
   * Check if all variables from the first list are included in the second list.
   * The second list may contain other variables as well.
   * @param varsNeedles A list of variables to search for.
   * @param varsHaystack A list of variables to search in.
   */
  public variablesSubSetOf(varsNeedles: RDF.Variable[], varsHaystack: RDF.Variable[]): boolean {
    return varsNeedles.length <= varsHaystack.length &&
      varsNeedles.every(varA => varsHaystack.some(varB => varA.equals(varB)));
  }

  /**
   * Check if an expression is simply 'false'.
   * @param expression An expression.
   */
  public isExpressionFalse(expression: Algebra.Expression): boolean {
    return (expression.term && expression.term.termType === 'Literal' && expression.term.value === 'false');
  }

  /**
   * Get all directly nested filter expressions.
   * As soon as a non-filter is found, it is returned as the input field.
   * @param op A filter expression.
   */
  public getNestedFilterExpressions(
    op: Algebra.Filter,
  ): { nestedExpressions: Algebra.Expression[]; input: Algebra.Operation } {
    if (op.input.type === Algebra.types.FILTER) {
      const childData = this.getNestedFilterExpressions(op.input);
      return { nestedExpressions: [ op.expression, ...childData.nestedExpressions ], input: childData.input };
    }
    return { nestedExpressions: [ op.expression ], input: op.input };
  }
}

export interface IActorOptimizeQueryOperationFilterPushdownArgs extends IActorOptimizeQueryOperationArgs {
  /**
   * The maximum number of full iterations across the query can be done for attempting to push down filters.
   * @default {10}
   */
  maxIterations: number;
  /**
   * If conjunctive filters should be split into nested filters before applying filter pushdown.
   * This can enable pushing down deeper.
   * @range {boolean}
   * @default {true}
   */
  splitConjunctive: boolean;
  /**
   * If nested filters should be merged into conjunctive filters after applying filter pushdown.
   * @range {boolean}
   * @default {true}
   */
  mergeConjunctive: boolean;
  /**
   * If filters should be pushed into left-joins.
   * @range {boolean}
   * @default {false}
   */
  pushIntoLeftJoins: boolean;
}
