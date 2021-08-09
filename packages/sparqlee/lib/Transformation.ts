import type * as RDF from 'rdf-js';
import * as RDFString from 'rdf-string';
import { Algebra as Alg } from 'sparqlalgebrajs';

import type { AsyncExtensionFunction, AsyncExtensionFunctionCreator } from './evaluators/AsyncEvaluator';
import type { SyncExtensionFunction, SyncExtensionFunctionCreator } from './evaluators/SyncEvaluator';
import * as E from './expressions';
import type { AsyncExtensionApplication, SimpleApplication } from './expressions';
import { namedFunctions, regularFunctions, specialFunctions } from './functions';
import * as C from './util/Consts';
import { TypeURL as DT } from './util/Consts';
import * as Err from './util/Errors';
import { ExtensionFunctionError } from './util/Errors';
import * as P from './util/Parsing';

type FunctionCreatorConfig = { type: 'sync'; creator: SyncExtensionFunctionCreator } |
{ type: 'async'; creator: AsyncExtensionFunctionCreator };

export function transformAlgebra(expr: Alg.Expression, creatorConfig: FunctionCreatorConfig): E.Expression {
  if (!expr) {
    throw new Err.InvalidExpression(expr);
  }
  const types = Alg.expressionTypes;

  switch (expr.expressionType) {
    case types.TERM:
      return transformTerm(<Alg.TermExpression> expr);
    case types.OPERATOR:
      return transformOperator(<Alg.OperatorExpression> expr, creatorConfig);
    case types.NAMED:
      return transformNamed(<Alg.NamedExpression> expr, creatorConfig);
    case types.EXISTENCE:
      return transformExistence(<Alg.ExistenceExpression> expr);
    case types.AGGREGATE:
      return transformAggregate(<Alg.AggregateExpression> expr);
    case types.WILDCARD:
      return transformWildcard(<Alg.WildcardExpression> expr);
    default: throw new Err.InvalidExpressionType(expr);
  }
}

/**
 * Transforms an RDF term to the internal representation of a term,
 * assuming it is not a variable, which would be an expression (internally).
 *
 * @param term RDF term to transform into internal representation of a term
 */
export function transformRDFTermUnsafe(term: RDF.Term): E.Term {
  return <E.Term> transformTerm({
    term,
    type: 'expression',
    expressionType: 'term',
  });
}

function transformTerm(term: Alg.TermExpression): E.Expression {
  if (!term.term) {
    throw new Err.InvalidExpression(term);
  }

  switch (term.term.termType) {
    case 'Variable': return new E.Variable(RDFString.termToString(term.term));
    case 'Literal': return transformLiteral(term.term);
    case 'NamedNode': return new E.NamedNode(term.term.value);
    case 'BlankNode': return new E.BlankNode(term.term.value);
    default: throw new Err.InvalidTermType(term);
  }
}

function transformWildcard(term: Alg.WildcardExpression): E.Expression {
  if (!term.wildcard) {
    throw new Err.InvalidExpression(term);
  }

  return new E.NamedNode(term.wildcard.value);
}

// TODO: Maybe do this with a map?
export function transformLiteral(lit: RDF.Literal): E.Literal<any> {
  if (!lit.datatype) {
    return lit.language ?
      new E.LangStringLiteral(lit.value, lit.language) :
      new E.StringLiteral(lit.value);
  }

  switch (lit.datatype.value) {
    case null:
    case undefined:
    case '': {
      return lit.language ?
        new E.LangStringLiteral(lit.value, lit.language) :
        new E.StringLiteral(lit.value);
    }

    case DT.XSD_STRING:
      return new E.StringLiteral(lit.value);
    case DT.RDF_LANG_STRING:
      return new E.LangStringLiteral(lit.value, lit.language);

    case DT.XSD_DATE_TIME:
    case DT.XSD_DATE: {
      const dateVal: Date = new Date(lit.value);
      if (Number.isNaN(dateVal.getTime())) {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.DateTimeLiteral(new Date(lit.value), lit.value);
    }

    case DT.XSD_BOOLEAN: {
      if (lit.value !== 'true' && lit.value !== 'false' && lit.value !== '1' && lit.value !== '0') {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.BooleanLiteral(lit.value === 'true' || lit.value === '1', lit.value);
    }

    case DT.XSD_INTEGER:
    case DT.XSD_DECIMAL:
    case DT.XSD_NEGATIVE_INTEGER:
    case DT.XSD_NON_NEGATIVE_INTEGER:
    case DT.XSD_NON_POSITIVE_INTEGER:
    case DT.XSD_POSITIVE_INTEGER:
    case DT.XSD_LONG:
    case DT.XSD_SHORT:
    case DT.XSD_BYTE:
    case DT.XSD_UNSIGNED_LONG:
    case DT.XSD_UNSIGNED_INT:
    case DT.XSD_UNSIGNED_SHORT:
    case DT.XSD_UNSIGNED_BYTE:
    case DT.XSD_INT: {
      const intVal: number = P.parseXSDDecimal(lit.value);
      if (intVal === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.NumericLiteral(intVal, lit.datatype, lit.value);
    }
    case DT.XSD_FLOAT:
    case DT.XSD_DOUBLE: {
      const doubleVal: number = P.parseXSDFloat(lit.value);
      if (doubleVal === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.NumericLiteral(doubleVal, lit.datatype, lit.value);
    }
    default: return new E.Literal<string>(lit.value, lit.datatype, lit.value);
  }
}

function transformOperator(expr: Alg.OperatorExpression, creatorConfig: FunctionCreatorConfig):
E.OperatorExpression | E.SpecialOperatorExpression {
  if (C.SpecialOperators.has(expr.operator)) {
    const specialOp = <C.SpecialOperator> expr.operator;
    const specialArgs = expr.args.map(arg => transformAlgebra(arg, creatorConfig));
    const specialFunc = specialFunctions[specialOp];
    if (!specialFunc.checkArity(specialArgs)) {
      throw new Err.InvalidArity(specialArgs, specialOp);
    }
    return new E.SpecialOperator(specialArgs, specialFunc.applyAsync, specialFunc.applySync);
  }
  if (!C.Operators.has(expr.operator)) {
    throw new Err.UnknownOperator(expr.operator);
  }
  const regularOp = <C.RegularOperator> expr.operator;
  const regularArgs = expr.args.map(arg => transformAlgebra(arg, creatorConfig));
  const regularFunc = regularFunctions[regularOp];
  if (!hasCorrectArity(regularArgs, regularFunc.arity)) {
    throw new Err.InvalidArity(regularArgs, regularOp);
  }
  return new E.Operator(regularArgs, regularFunc.apply);
}

function wrapSyncFunction(func: SyncExtensionFunction, name: string): SimpleApplication {
  return args => {
    try {
      const res = func(args.map(arg => arg.toRDF()));
      return transformRDFTermUnsafe(res);
    } catch (error: unknown) {
      throw new ExtensionFunctionError(name, error);
    }
  };
}

function wrapAsyncFunction(func: AsyncExtensionFunction, name: string): AsyncExtensionApplication {
  return async args => {
    try {
      const res = await func(args.map(arg => arg.toRDF()));
      return transformRDFTermUnsafe(res);
    } catch (error: unknown) {
      throw new ExtensionFunctionError(name, error);
    }
  };
}
// TODO: Support passing functions to override default behaviour;
function transformNamed(expr: Alg.NamedExpression, creatorConfig: FunctionCreatorConfig):
E.NamedExpression | E.AsyncExtensionExpression | E.SyncExtensionExpression {
  const funcName = expr.name.value;
  const args = expr.args.map(arg => transformAlgebra(arg, creatorConfig));
  if (C.NamedOperators.has(<C.NamedOperator> funcName)) {
    // Return a basic named expression
    const op = <C.NamedOperator> expr.name.value;
    const namedFunc = namedFunctions[op];
    return new E.Named(expr.name, args, namedFunc.apply);
  }
  if (creatorConfig.type === 'sync') {
    // Expression might be extension function, check this for the sync
    const syncExtensionFunc = creatorConfig.creator(expr.name);
    if (syncExtensionFunc) {
      const simpleAppl = wrapSyncFunction(syncExtensionFunc, expr.name.value);
      return new E.SyncExtension(expr.name, args, simpleAppl);
    }
  } else {
    // The expression might be an extension function, check this for the async case
    const asyncExtensionFunc = creatorConfig.creator(expr.name);
    if (asyncExtensionFunc) {
      const asyncAppl = wrapAsyncFunction(asyncExtensionFunc, expr.name.value);
      return new E.AsyncExtension(expr.name, args, asyncAppl);
    }
  }
  throw new Err.UnknownNamedOperator(expr.name.value);
}

function hasCorrectArity(args: E.Expression[], arity: number | number[]): boolean {
  // Infinity is used to represent var-args, so it's always correct.
  if (arity === Number.POSITIVE_INFINITY) {
    return true;
  }

  // If the function has overloaded arity, the actual arity needs to be present.
  if (Array.isArray(arity)) {
    return arity.includes(args.length);
  }

  return args.length === arity;
}

export function transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
  const name = expr.aggregator;
  return new E.Aggregate(name, expr);
}

export function transformExistence(expr: Alg.ExistenceExpression): E.Existence {
  return new E.Existence(expr);
}
