import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils, isKnownOperation, isKnownSubType } from '@comunica/utils-algebra';
import { getExpressionVariables, getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Filter Equality Join Optimize Query Operation Actor.
 *
 * It rewrites a filter over a join, with an equality such as FILTER(STR(?a) = STR(?b)) between join entries that
 * are not joined otherwise, so that each of the two entries binds its side of the equality to a new variable.
 * The entries are then joined on that variable, instead of filtering their cross product.
 * The filter is kept, and the new variable is projected away.
 */
export class ActorOptimizeQueryOperationFilterEqualityJoin extends ActorOptimizeQueryOperation {
  public static readonly KEY_VARIABLE_PREFIX = '__comunica_join_key_';

  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    if (!algebraUtils.hasOperationType(action.operation, [ Algebra.Types.FILTER ])) {
      return { operation: action.operation, context: action.context };
    }
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // New variables must not occur anywhere in the query
    const variableNames = ActorOptimizeQueryOperationFilterEqualityJoin.getVariableNames(action.operation);
    let counter = 0;
    const createKeyVariable = (): RDF.Variable => {
      let name: string;
      do {
        name = `${ActorOptimizeQueryOperationFilterEqualityJoin.KEY_VARIABLE_PREFIX}${counter++}`;
      } while (variableNames.has(name));
      return dataFactory.variable(name);
    };

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.FILTER]: {
        transform: (filter: Algebra.Filter) => ActorOptimizeQueryOperationFilterEqualityJoin
          .joinOnEqualities(filter, algebraFactory, createKeyVariable),
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Rewrite a filter over a join, so that the join entries that are only related via equalities in the filter
   * are joined on these equalities.
   * @param filter A filter operation.
   * @param algebraFactory An algebra factory.
   * @param createKeyVariable A function that returns a new variable.
   * @return The rewritten operation, or the given filter if it can not be rewritten.
   */
  public static joinOnEqualities(
    filter: Algebra.Filter,
    algebraFactory: AlgebraFactory,
    createKeyVariable: () => RDF.Variable,
  ): Algebra.Operation {
    // Bind joins can be applied on filters of a left join or of a source, but not on extends, so these are kept
    if (!isKnownOperation(filter.input, Algebra.Types.JOIN) || filter.metadata?.isHoistedLeftJoinFilter ||
      getOperationSource(filter)) {
      return filter;
    }

    const entries = [ ...filter.input.input ];
    const entryVariables = entries.map(entry => new Set(algebraUtils.inScopeVariables(entry)
      .map(variable => variable.value)));

    // Group the entries that are joined with each other via shared variables
    const groups = entries.map((_, i) => i);
    const mergeGroups = (groupA: number, groupB: number): void => {
      for (const [ i, group ] of groups.entries()) {
        if (group === groupB) {
          groups[i] = groupA;
        }
      }
    };
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if ([ ...entryVariables[i] ].some(variable => entryVariables[j].has(variable))) {
          mergeGroups(groups[i], groups[j]);
        }
      }
    }

    // Join the groups that are only related via an equality on a key
    let modified = false;
    for (const [ left, right ] of ActorOptimizeQueryOperationFilterEqualityJoin.getKeyEqualities(filter.expression)) {
      const leftIndex = ActorOptimizeQueryOperationFilterEqualityJoin.getEntryIndex(entryVariables, left);
      const rightIndex = ActorOptimizeQueryOperationFilterEqualityJoin.getEntryIndex(entryVariables, right);
      if (leftIndex >= 0 && rightIndex >= 0 && groups[leftIndex] !== groups[rightIndex]) {
        const key = createKeyVariable();
        entries[leftIndex] = algebraFactory.createExtend(entries[leftIndex], key, left);
        entries[rightIndex] = algebraFactory.createExtend(entries[rightIndex], key, right);
        entryVariables[leftIndex].add(key.value);
        entryVariables[rightIndex].add(key.value);
        mergeGroups(groups[leftIndex], groups[rightIndex]);
        modified = true;
      }
    }
    if (!modified) {
      return filter;
    }

    const filterJoined: Algebra.Operation = algebraFactory
      .createFilter(algebraFactory.createJoin(entries, false), filter.expression);
    if (filter.metadata) {
      filterJoined.metadata = filter.metadata;
    }
    return algebraFactory.createProject(filterJoined, algebraUtils.inScopeVariables(filter));
  }

  /**
   * Get the equalities in an expression that are true only if both sides are the same term,
   * and must hold for the expression to be true.
   * These are sameTerm calls, and equalities of STR calls, which are simple literals.
   * @param expression An expression.
   * @return Pairs of the expressions on both sides of the equalities.
   */
  public static getKeyEqualities(expression: Algebra.Expression): [ Algebra.Expression, Algebra.Expression ][] {
    if (isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR)) {
      if (expression.operator === '&&') {
        return expression.args
          .flatMap(arg => ActorOptimizeQueryOperationFilterEqualityJoin.getKeyEqualities(arg));
      }
      if (expression.operator === 'sameterm' || (expression.operator === '=' && expression.args
        .every(arg => isKnownSubType(arg, Algebra.ExpressionTypes.OPERATOR) && arg.operator === 'str'))) {
        return [[ expression.args[0], expression.args[1] ]];
      }
    }
    return [];
  }

  /**
   * Find the join entry that binds all variables of an expression.
   * @param entryVariables The names of the variables of each join entry.
   * @param expression An expression.
   * @return The index of the entry, or -1 if no single entry binds all variables, or the expression has none.
   */
  public static getEntryIndex(entryVariables: Set<string>[], expression: Algebra.Expression): number {
    const variables = getExpressionVariables(expression);
    if (variables.length === 0) {
      return -1;
    }
    return entryVariables.findIndex(names => variables.every(variable => names.has(variable.value)));
  }

  /**
   * Determine the names of all variables that occur in the given operation, including in expressions.
   * @param operation An operation.
   */
  public static getVariableNames(operation: Algebra.Operation): Set<string> {
    const names = new Set<string>();
    const visited = new Set<object>();
    const visit = (value: any): void => {
      if (value && typeof value === 'object' && !visited.has(value)) {
        visited.add(value);
        if (value.termType === 'Variable') {
          names.add(value.value);
        }
        for (const [ key, child ] of Object.entries(value)) {
          if (key !== 'metadata') {
            visit(child);
          }
        }
      }
    };
    visit(operation);
    return names;
  }
}
