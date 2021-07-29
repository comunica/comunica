import * as RDF from 'rdf-js';
import * as RDFString from 'rdf-string';
import {Algebra as Alg} from 'sparqlalgebrajs';

import * as E from './expressions';
import {AsyncExtensionApplication, SimpleApplication} from './expressions';
import * as C from './util/Consts';
import {TypeURL as DT} from './util/Consts';
import * as Err from './util/Errors';
import {ExtensionFunctionError} from './util/Errors';
import * as P from './util/Parsing';

import {namedFunctions, regularFunctions, specialFunctions,} from './functions';
import {AsyncExtensionFunction, AsyncExtensionFunctionCreator} from './evaluators/AsyncEvaluator';
import {SyncExtensionFunction, SyncExtensionFunctionCreator} from './evaluators/SyncEvaluator';

type FunctionCreatorConfig = {type: 'sync', creator: SyncExtensionFunctionCreator} |
  {type: 'async', creator: AsyncExtensionFunctionCreator};

export function transformAlgebra(expr: Alg.Expression, creatorConfig: FunctionCreatorConfig): E.Expression {
  if (!expr) { throw new Err.InvalidExpression(expr); }
  const types = Alg.expressionTypes;

  switch (expr.expressionType) {
    case types.TERM:
      return transformTerm(expr as Alg.TermExpression);
    case types.OPERATOR:
      return transformOperator(expr as Alg.OperatorExpression, creatorConfig);
    case types.NAMED:
      return transformNamed(expr as Alg.NamedExpression, creatorConfig);
    case types.EXISTENCE:
      return transformExistence(expr as Alg.ExistenceExpression);
    case types.AGGREGATE:
      return transformAggregate(expr as Alg.AggregateExpression);
    case types.WILDCARD:
      return transformWildcard(expr as Alg.WildcardExpression);
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
  return transformTerm({
    term,
    type: 'expression',
    expressionType: 'term',
  }) as E.Term;
}

function transformTerm(term: Alg.TermExpression): E.Expression {
  if (!term.term) { throw new Err.InvalidExpression(term); }

  switch (term.term.termType) {
    case 'Variable': return new E.Variable(RDFString.termToString(term.term));
    case 'Literal': return transformLiteral(term.term as RDF.Literal);
    case 'NamedNode': return new E.NamedNode(term.term.value);
    case 'BlankNode': return new E.BlankNode(term.term.value);
    default: throw new Err.InvalidTermType(term);
  }
}

function transformWildcard(term: Alg.WildcardExpression): E.Expression {
  if (!term.wildcard) { throw new Err.InvalidExpression(term); }

  return new E.NamedNode(term.wildcard.value);
}

// TODO: Maybe do this with a map?
// tslint:disable-next-line:no-any
export function transformLiteral(lit: RDF.Literal): E.Literal<any> {

  if (!lit.datatype) {
    return (lit.language)
      ? new E.LangStringLiteral(lit.value, lit.language)
      : new E.StringLiteral(lit.value);
  }

  switch (lit.datatype.value) {
    case null:
    case undefined:
    case '': {
      return (lit.language)
        ? new E.LangStringLiteral(lit.value, lit.language)
        : new E.StringLiteral(lit.value);
    }

    case DT.XSD_STRING:
      return new E.StringLiteral(lit.value);
    case DT.RDF_LANG_STRING:
      return new E.LangStringLiteral(lit.value, lit.language);

    case DT.XSD_DATE_TIME:
    case DT.XSD_DATE: {
      const val: Date = new Date(lit.value);
      if (isNaN(val.getTime())) {
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
      const val: number = P.parseXSDDecimal(lit.value);
      if (val === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.NumericLiteral(val, lit.datatype, lit.value);
    }
    case DT.XSD_FLOAT:
    case DT.XSD_DOUBLE: {
      const val: number = P.parseXSDFloat(lit.value);
      if (val === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.datatype, lit.value);
      }
      return new E.NumericLiteral(val, lit.datatype, lit.value);
    }
    default: return new E.Literal<string>(lit.value, lit.datatype, lit.value);
  }
}

function transformOperator(expr: Alg.OperatorExpression, creatorConfig: FunctionCreatorConfig)
  : E.OperatorExpression | E.SpecialOperatorExpression {
  if (C.SpecialOperators.contains(expr.operator)) {
    const op = expr.operator as C.SpecialOperator;
    const args = expr.args.map((a) => transformAlgebra(a, creatorConfig));
    const func = specialFunctions.get(op);
    if (!func.checkArity(args)) {
      throw new Err.InvalidArity(args, op);
    }
    return new E.SpecialOperator(args, func.applyAsync, func.applySync);
  } else {
    if (!C.Operators.contains(expr.operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const op = expr.operator as C.RegularOperator;
    const args = expr.args.map((a) => transformAlgebra(a, creatorConfig));
    const func = regularFunctions.get(op);
    if (!hasCorrectArity(args, func.arity)) { throw new Err.InvalidArity(args, op); }
    return new E.Operator(args, func.apply);
  }
}

function wrapSyncFunction(f: SyncExtensionFunction, name: string): SimpleApplication {
  return (args => {
    let res;
    try {
      res = f(args.map(arg => arg.toRDF()));
    }catch (e) {
      throw new ExtensionFunctionError(name, e);
    }
    return transformRDFTermUnsafe(res);
  });
}

function wrapAsyncFunction(f: AsyncExtensionFunction, name: string): AsyncExtensionApplication {
  return (async args => {
    let res;
    try {
      res = await f(args.map(arg => arg.toRDF()));
    }catch (e) {
      throw new ExtensionFunctionError(name, e);
    }
    return transformRDFTermUnsafe(res);
  });
}
// TODO: Support passing functions to override default behaviour;
function transformNamed(expr: Alg.NamedExpression, creatorConfig: FunctionCreatorConfig)
  : E.NamedExpression | E.AsyncExtensionExpression | E.SyncExtensionExpression  {
  const funcName = expr.name.value;
  const args = expr.args.map((a) => transformAlgebra(a, creatorConfig));
  if (C.NamedOperators.contains(funcName as C.NamedOperator)) {
    // return a basic named expression
    const op = expr.name.value as any as C.NamedOperator;
    const func = namedFunctions.get(op);
    return new E.Named(expr.name, args, func.apply);
  } else if (creatorConfig.type === 'sync') {
    // Expression might be extension function, check this for the sync
    const func = creatorConfig.creator(expr.name);
    if (func) {
      const simpleAppl = wrapSyncFunction(func, expr.name.value);
      return new E.SyncExtension(expr.name, args, simpleAppl);
    }
  } else {
    // The expression might be an extension function, check this for the async case
    const func = creatorConfig.creator(expr.name);
    if (func) {
      const asyncAppl = wrapAsyncFunction(func, expr.name.value);
      return new E.AsyncExtension(expr.name, args, asyncAppl);
    }
  }
  throw new Err.UnknownNamedOperator(expr.name.value);
}

function hasCorrectArity(args: E.Expression[], arity: number | number[]): boolean {
  // Infinity is used to represent var-args, so it's always correct.
  if (arity === Infinity) { return true; }

  // If the function has overloaded arity, the actual arity needs to be present.
  if (Array.isArray(arity)) {
    return arity.indexOf(args.length) >= 0;
  }

  return args.length === arity;
}

export function transformAggregate(expr: Alg.AggregateExpression) {
  const name = expr.aggregator;
  return new E.Aggregate(name, expr);
}

export function transformExistence(expr: Alg.ExistenceExpression) {
  return new E.Existence(expr);
}
