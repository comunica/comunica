import type { RegularFunction } from '@comunica/bus-function-factory/lib/implementation/Core';
import { BaseFunctionDefinition } from '@comunica/bus-function-factory/lib/implementation/Core';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import * as E from '@comunica/expression-evaluator/lib/expressions';
import {
  bool,
  declare,
  expressionToVar,
  langString,
  string,
} from '@comunica/expression-evaluator/lib/functions/Helpers';
import type { IEvalContext, OverloadTree } from '@comunica/expression-evaluator/lib/functions/OverloadTree';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import { regularFunctions } from './RegularFunctions';

// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------

// BOUND ----------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Bound extends BaseFunctionDefinition {
  protected arity = 1;

  public apply = async({ args, mapping }: IEvalContext): Promise<E.TermExpression> => {
    const variable = <E.VariableExpression> args[0];
    if (variable.expressionType !== E.ExpressionType.Variable) {
      throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
    }
    const val = mapping.has(expressionToVar(variable));
    return bool(val);
  };
}

// IF -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class IfSPARQL extends BaseFunctionDefinition {
  protected arity = 3;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> => {
    const valFirst = await exprEval.evaluatorExpressionEvaluation(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      exprEval.evaluatorExpressionEvaluation(args[1], mapping) :
      exprEval.evaluatorExpressionEvaluation(args[2], mapping);
  };
}

// COALESCE -------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Coalesce extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> => {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await exprEval.evaluatorExpressionEvaluation(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new Err.CoalesceError(errors);
  };
}

// Logical-or (||) ------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalOr extends BaseFunctionDefinition {
  protected arity = 2;
  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> => {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) {
        return bool(true);
      }
      const rightTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (!rightError) {
        throw error;
      }
      return bool(true);
    }
  };
}

// Logical-and (&&) -----------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalAnd extends BaseFunctionDefinition {
  protected arity = 2;

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> => {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) {
        return bool(false);
      }
      const rightTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluatorExpressionEvaluation(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (rightError) {
        throw error;
      }
      return bool(false);
    }
  };
}

// SameTerm -------------------------------------------------------------------

/**
 * TODO: why is this a special function?
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class SameTerm extends BaseFunctionDefinition {
  protected arity = 2;
  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> => {
    const [ leftExpr, rightExpr ] = args.map(arg => exprEval.evaluatorExpressionEvaluation(arg, mapping));
    const [ left, right ] = await Promise.all([ leftExpr, rightExpr ]);
    return bool(left.toRDF().equals(right.toRDF()));
  };
}

// IN -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class InSPARQL extends BaseFunctionDefinition {
  // TODO: when all is done, this should be injected in some way!
  public constructor(private readonly equalityFunction: RegularFunction) {
    super();
  }

  protected arity = Number.POSITIVE_INFINITY;

  public override checkArity(args: E.Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<E.TermExpression> => {
    const { args, mapping, exprEval } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
    return await this.inRecursive(left, { ...context, args: remaining }, []);
  };

  private async inRecursive(
    needle: E.TermExpression,
    context: IEvalContext,
    results: (Error | false)[],
  ): Promise<E.TermExpression> {
    const { args, mapping, exprEval } = context;
    if (args.length === 0) {
      const noErrors = results.every(val => !val);
      return noErrors ? bool(false) : Promise.reject(new Err.InError(results));
    }

    try {
      // We know this will not be undefined because we check args.length === 0
      const nextExpression = args.shift()!;
      const next = await exprEval.evaluatorExpressionEvaluation(nextExpression, mapping);
      if ((<E.BooleanLiteral> this.equalityFunction.applyOnTerms([ needle, next ], exprEval)).typedValue) {
        return bool(true);
      }
      return this.inRecursive(needle, context, [ ...results, false ]);
    } catch (error: unknown) {
      return this.inRecursive(needle, context, [ ...results, <Error> error ]);
    }
  }
}

// NOT IN ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class NotInSPARQL extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public override checkArity(args: E.Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<E.TermExpression> => {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = await _in.apply(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  };
}

// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------

// CONCAT ---------------------------------------------------------------------

/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const concatTree: OverloadTree = declare(C.SpecialOperator.CONCAT).onStringly1(() => expr => expr)
  .collect();

/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
class Concat extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public apply = async(context: IEvalContext): Promise<E.TermExpression> => {
    const { args, mapping, exprEval } = context;
    const pLits: Promise<E.Literal<string>>[] = args
      .map(async expr => exprEval.evaluatorExpressionEvaluation(expr, mapping))
      .map(async(pTerm) => {
        const operation = concatTree.search(
          [ await pTerm ],
          exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
          exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
        );
        if (!operation) {
          throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.CONCAT);
        }
        return <E.Literal<string>> operation(exprEval)([ await pTerm ]);
      });
    const lits = await Promise.all(pLits);
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  };
}

function langAllEqual(lits: E.Literal<string>[]): boolean {
  return lits.length > 0 && lits.every(lit => lit.language === lits[0].language);
}

// ----------------------------------------------------------------------------
// Context dependant functions
// ----------------------------------------------------------------------------

// BNODE ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
class BNode extends BaseFunctionDefinition {
  /**
   * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
   */
  private static readonly bnodeTree = declare(C.SpecialOperator.BNODE).onString1(() => arg => arg).collect();

  /**
   * A counter that keeps track blank node generated through BNODE() SPARQL
   * expressions.
   */
  private static bnodeCounter = 0;

  protected arity = Number.POSITIVE_INFINITY;
  public override checkArity(args: E.Expression[]): boolean {
    return args.length === 0 || args.length === 1;
  }

  public apply = async(context: IEvalContext): Promise<E.TermExpression> => {
    const { args, mapping, exprEval } = context;
    const input = args.length === 1 ?
      await exprEval.evaluatorExpressionEvaluation(args[0], mapping) :
      undefined;

    let strInput: string | undefined;
    if (input) {
      const operation = BNode.bnodeTree.search(
        [ input ],
        exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
      );
      if (!operation) {
        throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
      }
      strInput = operation(exprEval)([ input ]).str();
    }

    const bnode = new BlankNodeBindingsScoped(strInput ?? `BNODE_${BNode.bnodeCounter++}`);
    return new E.BlankNode(bnode);
  };
}

// ----------------------------------------------------------------------------
// Wrap these declarations into functions
// ----------------------------------------------------------------------------

export const specialFunctions: Record<C.SpecialOperator, BaseFunctionDefinition> = {
  // --------------------------------------------------------------------------
  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  bound: new Bound(),
  if: new IfSPARQL(),
  coalesce: new Coalesce(),
  '&&': new LogicalAnd(),
  '||': new LogicalOr(),
  sameterm: new SameTerm(),
  in: new InSPARQL(regularFunctions[C.RegularOperator.EQUAL]),
  notin: new NotInSPARQL(),

  // Annoying functions
  concat: new Concat(),

  // Context dependent functions
  bnode: new BNode(),
};
