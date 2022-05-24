import type * as RDF from '@rdfjs/types';
import * as uuid from 'uuid';
import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import { bool, declare, expressionToVar, langString, string } from './Helpers';
import type { EvalContextAsync, EvalContextSync, OverloadTree } from '.';
import { regularFunctions, specialFunctions } from '.';

type Term = E.TermExpression;
type PTerm = Promise<E.TermExpression>;

// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------

// BOUND ----------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const bound: ISpecialDefinition = {
  arity: 1,
  async applyAsync({ args, mapping }: EvalContextAsync): PTerm {
    return bound_({ args, mapping });
  },
  applySync({ args, mapping }: EvalContextSync): Term {
    return bound_({ args, mapping });
  },
};

function bound_({ args, mapping }: { args: E.Expression[]; mapping: RDF.Bindings }): E.BooleanLiteral {
  const variable = <E.VariableExpression> args[0];
  if (variable.expressionType !== E.ExpressionType.Variable) {
    throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
  }
  const val = mapping.has(expressionToVar(variable));
  return bool(val);
}

// IF -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const ifSPARQL: ISpecialDefinition = {
  arity: 3,
  async applyAsync({ args, mapping, evaluate }: EvalContextAsync): PTerm {
    const valFirst = await evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      evaluate(args[1], mapping) :
      evaluate(args[2], mapping);
  },
  applySync({ args, mapping, evaluate }: EvalContextSync): Term {
    const valFirst = evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      evaluate(args[1], mapping) :
      evaluate(args[2], mapping);
  },
};

// COALESCE -------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const coalesce: ISpecialDefinition = {
  arity: Number.POSITIVE_INFINITY,
  async applyAsync({ args, mapping, evaluate }: EvalContextAsync): PTerm {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await evaluate(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new Err.CoalesceError(errors);
  },
  applySync({ args, mapping, evaluate }: EvalContextSync): Term {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return evaluate(expr, mapping);
      } catch (error: unknown) {
        errors.push(<Error> error);
      }
    }
    throw new Err.CoalesceError(errors);
  },
};

// Logical-or (||) ------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const logicalOr: ISpecialDefinition = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: EvalContextAsync): PTerm {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) {
        return bool(true);
      }
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (!rightError) {
        throw error;
      }
      return bool(true);
    }
  },
  applySync({ args, mapping, evaluate }: EvalContextSync): Term {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) {
        return bool(true);
      }
      const rightTerm = evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (!rightError) {
        throw error;
      }
      return bool(true);
    }
  },
};

// Logical-and (&&) -----------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const logicalAnd: ISpecialDefinition = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: EvalContextAsync): PTerm {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = await evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) {
        return bool(false);
      }
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = await evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (rightError) {
        throw error;
      }
      return bool(false);
    }
  },
  applySync({ args, mapping, evaluate }: EvalContextSync): Term {
    const [ leftExpr, rightExpr ] = args;
    try {
      const leftTerm = evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) {
        return bool(false);
      }
      const rightTerm = evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (error: unknown) {
      const rightErrorTerm = evaluate(rightExpr, mapping);
      const rightError = rightErrorTerm.coerceEBV();
      if (rightError) {
        throw error;
      }
      return bool(false);
    }
  },
};

// SameTerm -------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const sameTerm: ISpecialDefinition = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: EvalContextAsync): PTerm {
    const [ leftExpr, rightExpr ] = args.map(arg => evaluate(arg, mapping));
    const [ left, right ] = await Promise.all([ leftExpr, rightExpr ]);
    return bool(left.toRDF().equals(right.toRDF()));
  },
  applySync({ args, mapping, evaluate }: EvalContextSync): Term {
    const [ left, right ] = args.map(arg => evaluate(arg, mapping));
    return bool(left.toRDF().equals(right.toRDF()));
  },
};

// IN -------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const inSPARQL: ISpecialDefinition = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length > 0;
  },
  async applyAsync(context: EvalContextAsync): PTerm {
    const { args, mapping, evaluate } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = await evaluate(leftExpr, mapping);
    return inRecursiveAsync(left, { ...context, args: remaining }, []);
  },
  applySync(context: EvalContextSync): Term {
    const { args, mapping, evaluate } = context;
    const [ leftExpr, ...remaining ] = args;
    const left = evaluate(leftExpr, mapping);
    return inRecursiveSync(left, { ...context, args: remaining }, []);
  },
};

async function inRecursiveAsync(
  needle: Term,
  context: EvalContextAsync,
  results: (Error | false)[],
): PTerm {
  const { args, mapping, evaluate } = context;
  if (args.length === 0) {
    const noErrors = results.every(val => !val);
    return noErrors ? bool(false) : Promise.reject(new Err.InError(results));
  }

  try {
    const nextExpression = args.shift();
    // We know this will not be undefined because we check args.length === 0
    const next = await evaluate(nextExpression!, mapping);
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];
    if ((<E.BooleanLiteral> isEqual.apply([ needle, next ], context)).typedValue) {
      return bool(true);
    }
    return inRecursiveAsync(needle, context, [ ...results, false ]);
  } catch (error: unknown) {
    return inRecursiveAsync(needle, context, [ ...results, <Error> error ]);
  }
}

function inRecursiveSync(
  needle: Term,
  context: EvalContextSync,
  results: (Error | false)[],
): Term {
  const { args, mapping, evaluate } = context;
  if (args.length === 0) {
    const noErrors = results.every(val => !val);
    if (noErrors) {
      return bool(false);
    }
    throw new Err.InError(results);
  }

  try {
    const nextExpression = args.shift();
    // We know this will not be undefined because we check args.length === 0
    const next = evaluate(nextExpression!, mapping);
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];
    if ((<E.BooleanLiteral> isEqual.apply([ needle, next ], context)).typedValue) {
      return bool(true);
    }
    return inRecursiveSync(needle, context, [ ...results, false ]);
  } catch (error: unknown) {
    return inRecursiveSync(needle, context, [ ...results, <Error> error ]);
  }
}

// NOT IN ---------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const notInSPARQL: ISpecialDefinition = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length > 0;
  },
  async applyAsync(context: EvalContextAsync): PTerm {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = await _in.applyAsync(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  },
  applySync(context: EvalContextSync): Term {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = _in.applySync(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  },
};

// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------

// CONCAT ---------------------------------------------------------------------

/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const concatTree: OverloadTree = declare(C.SpecialOperator.CONCAT).onStringly1(() => expr => expr)
  .collect().experimentalTree;

/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
const concat: ISpecialDefinition = {
  arity: Number.POSITIVE_INFINITY,
  async applyAsync(context: EvalContextAsync): PTerm {
    const { args, mapping, evaluate, overloadCache, superTypeProvider } = context;
    const pLits: Promise<E.Literal<string>>[] = args
      .map(async expr => evaluate(expr, mapping))
      .map(async pTerm => {
        const operation = concatTree.search([ await pTerm ], superTypeProvider, overloadCache);
        if (!operation) {
          throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.CONCAT);
        }
        return <E.Literal<string>> operation(context)([ await pTerm ]);
      });
    const lits = await Promise.all(pLits);
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  },

  applySync(context: EvalContextSync): Term {
    const { args, mapping, evaluate, superTypeProvider, overloadCache } = context;
    const lits = args
      .map(expr => evaluate(expr, mapping))
      .map(pTerm => {
        const operation = concatTree.search([ pTerm ], superTypeProvider, overloadCache);
        if (!operation) {
          throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.CONCAT);
        }
        return <E.Literal<string>> operation(context)([ pTerm ]);
      });
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  },
};

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
const bnodeTree = declare(C.SpecialOperator.BNODE).onString1(() => arg => arg).collect().experimentalTree;

/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
const BNODE: ISpecialDefinition = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length === 0 || args.length === 1;
  },
  async applyAsync(context: EvalContextAsync): PTerm {
    const { args, mapping, evaluate, superTypeProvider, overloadCache } = context;
    const input = args.length === 1 ?
      await evaluate(args[0], mapping) :
      undefined;

    let strInput: string | undefined;
    if (input) {
      const operation = bnodeTree.search([ input ], superTypeProvider, overloadCache);
      if (!operation) {
        throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
      }
      strInput = operation(context)([ input ]).str();
    }

    // eslint-disable-next-line unicorn/consistent-destructuring
    if (context.bnode) {
      const bnode = await context.bnode(strInput);
      return new E.BlankNode(bnode);
    }

    return BNODE_(strInput);
  },
  applySync(context: EvalContextSync): Term {
    const { args, mapping, evaluate, superTypeProvider, overloadCache } = context;
    const input = args.length === 1 ?
      evaluate(args[0], mapping) :
      undefined;

    let strInput: string | undefined;
    if (input) {
      const operation = bnodeTree.search([ input ], superTypeProvider, overloadCache);
      if (!operation) {
        throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
      }
      strInput = operation(context)([ input ]).str();
    }

    // eslint-disable-next-line unicorn/consistent-destructuring
    if (context.bnode) {
      const bnode = context.bnode(strInput);
      return new E.BlankNode(bnode);
    }

    return BNODE_(strInput);
  },
};

function BNODE_(input?: string): E.BlankNode {
  return new E.BlankNode(input || uuid.v4());
}

// ----------------------------------------------------------------------------
// Wrap these declarations into functions
// ----------------------------------------------------------------------------

export interface ISpecialDefinition {
  arity: number;
  applyAsync: E.SpecialApplicationAsync;
  // TODO: Test these implementations
  applySync: E.SpecialApplicationSync;
  checkArity?: (args: E.Expression[]) => boolean;
}

export const specialDefinitions: Record<C.SpecialOperator, ISpecialDefinition> = {
  // --------------------------------------------------------------------------
  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  bound,
  if: ifSPARQL,
  coalesce,
  '&&': logicalAnd,
  '||': logicalOr,
  sameterm: sameTerm,
  in: inSPARQL,
  notin: notInSPARQL,

  // Annoying functions
  concat,

  // Context dependent functions
  bnode: BNODE,
};
