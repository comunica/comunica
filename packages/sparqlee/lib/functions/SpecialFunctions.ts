import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import * as uuid from 'uuid';

import * as E from '../expressions';
import type { Bindings } from '../Types';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';

import { bool, langString, string, typeCheckLit } from './Helpers';
import { regularFunctions, specialFunctions } from '.';

type Term = E.TermExpression;
type PTerm = Promise<E.TermExpression>;

// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------

function _bound({ args, mapping }: { args: E.Expression[]; mapping: Bindings }): E.BooleanLiteral {
  const variable = <E.VariableExpression> args[0];
  if (variable.expressionType !== E.ExpressionType.Variable) {
    throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
  }
  const val = mapping.has(variable.name) && !!mapping.get(variable.name);
  return bool(val);
}

// BOUND ----------------------------------------------------------------------
const bound = {
  arity: 1,
  async applyAsync({ args, mapping }: E.EvalContextAsync): PTerm {
    return _bound({ args, mapping });
  },
  applySync({ args, mapping }: E.EvalContextSync): Term {
    return _bound({ args, mapping });
  },
};

// IF -------------------------------------------------------------------------
const ifSPARQL = {
  arity: 3,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const valFirst = await evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      evaluate(args[1], mapping) :
      evaluate(args[2], mapping);
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const valFirst = evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return ebv ?
      evaluate(args[1], mapping) :
      evaluate(args[2], mapping);
  },
};

// COALESCE -------------------------------------------------------------------
const coalesce = {
  arity: Number.POSITIVE_INFINITY,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
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
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
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
// https://www.w3.org/TR/sparql11-query/#func-logical-or
const logicalOr = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
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
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
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
// https://www.w3.org/TR/sparql11-query/#func-logical-and
const logicalAnd = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
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
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
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
const sameTerm = {
  arity: 2,
  async applyAsync({ args, mapping, evaluate }: E.EvalContextAsync): PTerm {
    const [ leftExpr, rightExpr ] = args.map(arg => evaluate(arg, mapping));
    const left = await leftExpr;
    const right = await rightExpr;
    return bool(left.toRDF().equals(right.toRDF()));
  },
  applySync({ args, mapping, evaluate }: E.EvalContextSync): Term {
    const [ left, right ] = args.map(arg => evaluate(arg, mapping));
    return bool(left.toRDF().equals(right.toRDF()));
  },
};

// IN -------------------------------------------------------------------------
const inSPARQL = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length > 0;
  },
  async applyAsync({ args, mapping, evaluate, context }: E.EvalContextAsync): PTerm {
    const [ leftExpr, ...remaining ] = args;
    const left = await evaluate(leftExpr, mapping);
    return inRecursiveAsync(left, { args: remaining, mapping, evaluate, context }, []);
  },
  applySync({ args, mapping, evaluate, context }: E.EvalContextSync): Term {
    const [ leftExpr, ...remaining ] = args;
    const left = evaluate(leftExpr, mapping);
    return inRecursiveSync(left, { args: remaining, mapping, evaluate, context }, []);
  },
};

async function inRecursiveAsync(
  needle: Term,
  { args, mapping, evaluate, context }: E.EvalContextAsync,
  results: (Error | false)[],
): PTerm {
  if (args.length === 0) {
    const noErrors = results.every(val => !val);
    return noErrors ? bool(false) : Promise.reject(new Err.InError(results));
  }

  try {
    const next = await evaluate(args.shift(), mapping);
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];
    if ((<E.BooleanLiteral> isEqual.apply([ needle, next ])).typedValue) {
      return bool(true);
    }
    return inRecursiveAsync(needle, { args, mapping, evaluate, context }, [ ...results, false ]);
  } catch (error: unknown) {
    return inRecursiveAsync(needle, { args, mapping, evaluate, context }, [ ...results, <Error> error ]);
  }
}

function inRecursiveSync(
  needle: Term,
  { args, mapping, evaluate, context }: E.EvalContextSync,
  results: (Error | false)[],
): Term {
  if (args.length === 0) {
    const noErrors = results.every(val => !val);
    if (noErrors) {
      return bool(false);
    }
    throw new Err.InError(results);
  }

  try {
    const next = evaluate(args.shift(), mapping);
    const isEqual = regularFunctions[C.RegularOperator.EQUAL];
    if ((<E.BooleanLiteral> isEqual.apply([ needle, next ])).typedValue) {
      return bool(true);
    }
    return inRecursiveSync(needle, { args, mapping, evaluate, context }, [ ...results, false ]);
  } catch (error: unknown) {
    return inRecursiveSync(needle, { args, mapping, evaluate, context }, [ ...results, <Error> error ]);
  }
}

// NOT IN ---------------------------------------------------------------------
const notInSPARQL = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length > 0;
  },
  async applyAsync(context: E.EvalContextAsync): PTerm {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = await _in.applyAsync(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  },
  applySync(context: E.EvalContextSync): Term {
    const _in = specialFunctions[C.SpecialOperator.IN];
    const isIn = _in.applySync(context);
    return bool(!(<E.BooleanLiteral> isIn).typedValue);
  },
};

// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------

// CONCAT
const concat = {
  arity: Number.POSITIVE_INFINITY,
  async applyAsync({ args, evaluate, mapping }: E.EvalContextAsync): PTerm {
    const pLits = args
      .map(async expr => evaluate(expr, mapping))
      .map(async pTerm =>
        typeCheckLit<string>(await pTerm, [ 'string', 'langString' ], args, C.SpecialOperator.CONCAT));
    const lits = await Promise.all(pLits);
    const strings = lits.map(lit => lit.typedValue);
    const joined = strings.join('');
    const lang = langAllEqual(lits) ? lits[0].language : undefined;
    return lang ? langString(joined, lang) : string(joined);
  },

  applySync({ args, evaluate, mapping }: E.EvalContextSync): Term {
    const lits = args
      .map(expr => evaluate(expr, mapping))
      .map(pTerm => typeCheckLit<string>(pTerm, [ 'string', 'langString' ], args, C.SpecialOperator.CONCAT));
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

const now = {
  arity: 0,
  async applyAsync({ context }: E.EvalContextAsync): PTerm {
    return new E.DateTimeLiteral(context.now, context.now.toISOString());
  },
  applySync({ context }: E.EvalContextSync): Term {
    return new E.DateTimeLiteral(context.now, context.now.toISOString());
  },
};

// https://www.w3.org/TR/sparql11-query/#func-iri
const IRI = {
  arity: 1,
  async applyAsync({ args, evaluate, mapping, context }: E.EvalContextAsync): PTerm {
    const input = await evaluate(args[0], mapping);
    return IRI_(input, context.baseIRI, args);
  },
  applySync({ args, evaluate, mapping, context }: E.EvalContextSync): Term {
    const input = evaluate(args[0], mapping);
    return IRI_(input, context.baseIRI, args);
  },
};

function IRI_(input: Term, baseIRI: string | undefined, args: E.Expression[]): Term {
  const lit = input.termType !== 'namedNode' ?
    typeCheckLit<string>(input, [ 'string' ], args, C.SpecialOperator.IRI) :
    <E.NamedNode> input;

  const iri = resolveRelativeIri(lit.str(), baseIRI || '');
  return new E.NamedNode(iri);
}

// https://www.w3.org/TR/sparql11-query/#func-bnode
// id has to be distinct over all id's in dataset
const BNODE = {
  arity: Number.POSITIVE_INFINITY,
  checkArity(args: E.Expression[]) {
    return args.length === 0 || args.length === 1;
  },
  async applyAsync({ args, evaluate, mapping, context }: E.EvalContextAsync): PTerm {
    const input = args.length === 1 ?
      await evaluate(args[0], mapping) :
      undefined;

    const strInput = input ?
      typeCheckLit(input, [ 'string' ], args, C.SpecialOperator.BNODE).str() :
      undefined;

    if (context.bnode) {
      const bnode = await context.bnode(strInput);
      return new E.BlankNode(bnode);
    }

    return BNODE_(strInput);
  },
  applySync({ args, evaluate, mapping, context }: E.EvalContextSync): Term {
    const input = args.length === 1 ?
      evaluate(args[0], mapping) :
      undefined;

    const strInput = input ?
      typeCheckLit(input, [ 'string' ], args, C.SpecialOperator.BNODE).str() :
      undefined;

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
  now,
  iri: IRI,
  uri: IRI,
  BNODE,
};

