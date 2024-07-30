import type { RegularFunction } from '@comunica/bus-function-factory';
import { BaseFunctionDefinition } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type {
  IEvalContext,
  OverloadTree,

  TermExpression,

  VariableExpression,
  BooleanLiteral,

  Expression,
  Literal,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,

  bool,
  declare,
  expressionToVar,
  langString,
  string,
  ExpressionType,
  InvalidArgumentTypes,
  CoalesceError,
  InError,
  BlankNode,
  SpecialOperator,
} from '@comunica/expression-evaluator';
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

  public apply = async({ args, mapping }: IEvalContext): Promise<TermExpression> => {
    const variable = <VariableExpression> args[0];
    if (variable.expressionType !== ExpressionType.Variable) {
      throw new InvalidArgumentTypes(args, SpecialOperator.BOUND);
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

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
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

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await exprEval.evaluatorExpressionEvaluation(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new CoalesceError(errors);
  };
}

// Logical-or (||) ------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalOr extends BaseFunctionDefinition {
  protected arity = 2;
  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
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

  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
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
  public apply = async({ args, mapping, exprEval }: IEvalContext): Promise<TermExpression> => {
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

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const { args, mapping, exprEval } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = await exprEval.evaluatorExpressionEvaluation(leftExpr, mapping);
    return await this.inRecursive(left, { ...context, args: remaining }, []);
  };

  private async inRecursive(
    needle: TermExpression,
    context: IEvalContext,
    results: (Error | false)[],
  ): Promise<TermExpression> {
    const { args, mapping, exprEval } = context;
    if (args.length === 0) {
      const noErrors = results.every(val => !val);
      return noErrors ? bool(false) : Promise.reject(new InError(results));
    }

    try {
      // We know this will not be undefined because we check args.length === 0
      const nextExpression = args.shift()!;
      const next = await exprEval.evaluatorExpressionEvaluation(nextExpression, mapping);
      if ((<BooleanLiteral> this.equalityFunction.applyOnTerms([ needle, next ], exprEval)).typedValue) {
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

  public override checkArity(args: Expression[]): boolean {
    return args.length > 0;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const _in = specialFunctions[SpecialOperator.IN];
    const isIn = await _in.apply(context);
    return bool(!(<BooleanLiteral> isIn).typedValue);
  };
}

// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------

// CONCAT ---------------------------------------------------------------------

/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const concatTree: OverloadTree = declare(SpecialOperator.CONCAT).onStringly1(() => expr => expr)
  .collect();

/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
class Concat extends BaseFunctionDefinition {
  protected arity = Number.POSITIVE_INFINITY;

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
    const { args, mapping, exprEval } = context;
    const pLits: Promise<Literal<string>>[] = args
      .map(async expr => exprEval.evaluatorExpressionEvaluation(expr, mapping))
      .map(async(pTerm) => {
        const operation = concatTree.search(
          [ await pTerm ],
          exprEval.context.getSafe(KeysExpressionEvaluator.superTypeProvider),
          exprEval.context.getSafe(KeysInitQuery.functionArgumentsCache),
        );
        if (!operation) {
          throw new InvalidArgumentTypes(args, SpecialOperator.CONCAT);
        }
        return <Literal<string>> operation(exprEval)([ await pTerm ]);
      });
    const lits = await Promise.all(pLits);
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  };
}

function langAllEqual(lits: Literal<string>[]): boolean {
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
  private static readonly bnodeTree = declare(SpecialOperator.BNODE).onString1(() => arg => arg).collect();

  /**
   * A counter that keeps track blank node generated through BNODE() SPARQL
   * expressions.
   */
  private static bnodeCounter = 0;

  protected arity = Number.POSITIVE_INFINITY;
  public override checkArity(args: Expression[]): boolean {
    return args.length === 0 || args.length === 1;
  }

  public apply = async(context: IEvalContext): Promise<TermExpression> => {
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
        throw new InvalidArgumentTypes(args, SpecialOperator.BNODE);
      }
      strInput = operation(exprEval)([ input ]).str();
    }

    const bnode = new BlankNodeBindingsScoped(strInput ?? `BNODE_${BNode.bnodeCounter++}`);
    return new BlankNode(bnode);
  };
}

// ----------------------------------------------------------------------------
// Wrap these declarations into functions
// ----------------------------------------------------------------------------

export const specialFunctions: Record<SpecialOperator, BaseFunctionDefinition> = {
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
  in: new InSPARQL(regularFunctions[RegularOperator.EQUAL]),
  notin: new NotInSPARQL(),

  // Annoying functions
  concat: new Concat(),

  // Context dependent functions
  bnode: new BNode(),
};
