import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
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
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    const operation = Util.mapOperation(action.operation, {
      filter(op: Algebra.Filter, factory: Factory) {
        // For all filter expressions in the operation,
        // we attempt to push them down as deep as possible into the algebra.
        const variables = self.getExpressionVariables(op.expression);
        return {
          recurse: true,
          result: self.filterPushdown(op.expression, variables, op.input, factory, action.context),
        };
      },
    });
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
   * @return The modified operation.
   */
  public filterPushdown(
    expression: Algebra.Expression,
    expressionVariables: RDF.Variable[],
    operation: Algebra.Operation,
    factory: Factory,
    context: IActionContext,
  ): Algebra.Operation {
    switch (operation.type) {
      case Algebra.types.EXTEND:
        // Pass if the variable is not part of the expression
        if (!this.variablesIntersect([ operation.variable ], expressionVariables)) {
          return factory.createExtend(
            this.filterPushdown(expression, expressionVariables, operation.input, factory, context),
            operation.variable,
            operation.expression,
          );
        }
        return factory.createFilter(operation, expression);
      case Algebra.types.FILTER:
        // Always pass
        return factory.createFilter(
          this.filterPushdown(expression, expressionVariables, operation.input, factory, context),
          operation.expression,
        );
      case Algebra.types.JOIN: {
        // Don't push down for empty join
        if (operation.input.length === 0) {
          return factory.createFilter(operation, expression);
        }

        // Determine overlapping operations
        const {
          fullyOverlapping,
          partiallyOverlapping,
          notOverlapping,
        } = this.getOverlappingOperations(operation, expressionVariables);

        const joins: Algebra.Operation[] = [];
        this.logDebug(context, `Push down filter across join entries with ${fullyOverlapping.length} fully overlapping, ${partiallyOverlapping.length} partially overlapping, and ${notOverlapping.length} not overlapping`);
        if (fullyOverlapping.length > 0) {
          joins.push(factory.createJoin(fullyOverlapping
            .map(input => this.filterPushdown(expression, expressionVariables, input, factory, context))));
        }
        if (partiallyOverlapping.length > 0) {
          joins.push(factory.createFilter(factory.createJoin(partiallyOverlapping, false), expression));
        }
        if (notOverlapping.length > 0) {
          joins.push(...notOverlapping);
        }

        return joins.length === 1 ? joins[0] : factory.createJoin(joins);
      }
      case Algebra.types.NOP:
        return operation;
      case Algebra.types.PROJECT:
        // Push down if variables overlap
        if (this.variablesIntersect(operation.variables, expressionVariables)) {
          return factory.createProject(
            this.filterPushdown(expression, expressionVariables, operation.input, factory, context),
            operation.variables,
          );
        }
        // Void expression otherwise
        return operation;
      case Algebra.types.UNION: {
        // Determine overlapping operations
        const {
          fullyOverlapping,
          partiallyOverlapping,
          notOverlapping,
        } = this.getOverlappingOperations(operation, expressionVariables);

        const unions: Algebra.Operation[] = [];
        this.logDebug(context, `Push down filter across union entries with ${fullyOverlapping.length} fully overlapping, ${partiallyOverlapping.length} partially overlapping, and ${notOverlapping.length} not overlapping`);
        if (fullyOverlapping.length > 0) {
          unions.push(factory.createUnion(fullyOverlapping
            .map(input => this.filterPushdown(expression, expressionVariables, input, factory, context))));
        }
        if (partiallyOverlapping.length > 0) {
          unions.push(factory.createFilter(factory.createUnion(partiallyOverlapping, false), expression));
        }
        if (notOverlapping.length > 0) {
          unions.push(...notOverlapping);
        }

        return unions.length === 1 ? unions[0] : factory.createUnion(unions);
      }
      case Algebra.types.VALUES:
        // Only keep filter if it overlaps with the variables
        if (this.variablesIntersect(operation.variables, expressionVariables)) {
          return factory.createFilter(operation, expression);
        }
        return operation;
      case Algebra.types.LEFT_JOIN:
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
        return factory.createFilter(operation, expression);
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
}
