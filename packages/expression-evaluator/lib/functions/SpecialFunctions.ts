import type { IEvalContext, IFunctionExpression } from '@comunica/types';
import * as uuid from 'uuid';
import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import { bool, declare, expressionToVar, langString, string } from './Helpers';
import type { OverloadTree } from '.';
import { regularFunctions, specialFunctions } from '.';

export abstract class SparqlFunction implements IFunctionExpression {
  protected abstract readonly arity: number;
  public abstract apply(evalContext: IEvalContext): Promise<E.TermExpression>;

  public checkArity(args: E.Expression[]): boolean {
    if (Array.isArray(this.arity)) {
      return this.arity.includes(args.length);
    }
    if (this.arity === Number.POSITIVE_INFINITY) {
      // Infinity is used to represent var-args, so it's always correct.
      return true;
    }

    return args.length === this.arity;
  }
}

// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------

// BOUND ----------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Bound extends SparqlFunction {
  protected arity = 1;

  public async apply({ args, mapping }: IEvalContext): Promise<E.TermExpression> {
    const variable = <E.VariableExpression> args[0];
    if (variable.expressionType !== E.ExpressionType.Variable) {
      throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
    }
    const val = mapping.has(expressionToVar(variable));
    return bool(val);
  }
}

// IF -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class IfSPARQL extends SparqlFunction {
  protected arity = 3;

  public async apply({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> {
    const valFirst = await exprEval.evaluator.evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      exprEval.evaluator.evaluate(args[1], mapping) :
      exprEval.evaluator.evaluate(args[2], mapping);
  }
}

// COALESCE -------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class Coalesce extends SparqlFunction {
  protected arity = Number.POSITIVE_INFINITY;

  public async apply({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await exprEval.evaluator.evaluate(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new Err.CoalesceError(errors);
  }
}

// Logical-or (||) ------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalOr extends SparqlFunction {
  protected arity = 2;
  public async apply({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluator.evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) {
        return bool(true);
      }
      const rightTerm = await exprEval.evaluator.evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluator.evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (!rightError) {
        throw error;
      }
      return bool(true);
    }
  }
}

// Logical-and (&&) -----------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class LogicalAnd extends SparqlFunction {
  protected arity = 2;

  public async apply({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await exprEval.evaluator.evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) {
        return bool(false);
      }
      const rightTerm = await exprEval.evaluator.evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await exprEval.evaluator.evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (rightError) {
        throw error;
      }
      return bool(false);
    }
  }
}

// SameTerm -------------------------------------------------------------------

/**
 * TODO: why is this a special function?
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class SameTerm extends SparqlFunction {
  protected arity = 2;
  public async apply({ args, mapping, exprEval }: IEvalContext): Promise<E.TermExpression> {
    const [ leftExpr, rightExpr ] = args.map(arg => exprEval.evaluator.evaluate(arg, mapping));
    const [ left, right ] = await Promise.all([ leftExpr, rightExpr ]);
    return bool(left.toRDF().equals(right.toRDF()));
  }
}

// IN -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class InSPARQL extends SparqlFunction {
  protected arity = Number.POSITIVE_INFINITY;

  public checkArity(args: E.Expression[]): boolean {
    return args.length > 0;
  }

  public async apply(context: IEvalContext): Promise<E.TermExpression> {
    async function inRecursive(
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
        const next = await exprEval.evaluator.evaluate(nextExpression, mapping);
        const isEqual = regularFunctions[C.RegularOperator.EQUAL];
        if ((<E.BooleanLiteral> isEqual.applyOnTerms([ needle, next ], exprEval)).typedValue) {
          return bool(true);
        }
        return inRecursive(needle, context, [ ...results, false ]);
      } catch (error: unknown) {
        return inRecursive(needle, context, [ ...results, <Error> error ]);
      }
    }

    const { args, mapping, exprEval } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = await exprEval.evaluator.evaluate(leftExpr, mapping);
    return await inRecursive(left, { ...context, args: remaining }, []);
  }
}

// NOT IN ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
class NotInSPARQL extends SparqlFunction {
  protected arity = Number.POSITIVE_INFINITY;

  public checkArity(args: E.Expression[]): boolean {
    return args.length > 0;
  }

  public async apply(context: IEvalContext): Promise<E.TermExpression> {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = await _in.apply(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  }
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
class Concat extends SparqlFunction {
  protected arity = Number.POSITIVE_INFINITY;

  public async apply(context: IEvalContext): Promise<E.TermExpression> {
    const { args, mapping, exprEval, functionArgumentsCache, superTypeProvider } = context;
    const pLits: Promise<E.Literal<string>>[] = args
      .map(async expr => exprEval.evaluator.evaluate(expr, mapping))
      .map(async pTerm => {
        const operation = concatTree.search([ await pTerm ], superTypeProvider, functionArgumentsCache);
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
  }
}

function langAllEqual(lits: E.Literal<string>[]): boolean {
  return lits.length > 0 && lits.every(lit => lit.language === lits[0].language);
}

// ----------------------------------------------------------------------------
// Context dependant functions
// ----------------------------------------------------------------------------

// BNODE ---------------------------------------------------------------------

/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const bnodeTree = declare(C.SpecialOperator.BNODE).onString1(() => arg => arg).collect();

/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
class BNode extends SparqlFunction {
  protected arity = Number.POSITIVE_INFINITY;
  public checkArity(args: E.Expression[]): boolean {
    return args.length === 0 || args.length === 1;
  }

  public async apply(context: IEvalContext): Promise<E.TermExpression> {
    const { args, mapping, exprEval, superTypeProvider, functionArgumentsCache } = context;
    const input = args.length === 1 ?
      await exprEval.evaluator.evaluate(args[0], mapping) :
      undefined;

    let strInput: string | undefined;
    if (input) {
      const operation = bnodeTree.search([ input ], superTypeProvider, functionArgumentsCache);
      if (!operation) {
        throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
      }
      strInput = operation(exprEval)([ input ]).str();
    }

    if (context.bnode) {
      const bnode = await context.bnode(strInput);
      return new E.BlankNode(bnode);
    }

    return BNODE_(strInput);
  }
}

function BNODE_(input?: string): E.BlankNode {
  return new E.BlankNode(input || uuid.v4());
}

// ----------------------------------------------------------------------------
// Wrap these declarations into functions
// ----------------------------------------------------------------------------

export const specialDefinitions: Record<C.SpecialOperator, SparqlFunction> = {
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
  in: new InSPARQL(),
  notin: new NotInSPARQL(),

  // Annoying functions
  concat: new Concat(),

  // Context dependent functions
  bnode: new BNode(),
};
