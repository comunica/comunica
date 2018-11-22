import * as RDF from 'rdf-js';
import * as RDFString from 'rdf-string';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from './expressions';
import * as C from './util/Consts';
import * as Err from './util/Errors';
import * as P from './util/Parsing';

import {
  namedFunctions,
  regularFunctions,
  specialFunctions,
} from './functions';
import { TypeURL as DT } from './util/Consts';

export function transformAlgebra(expr: Alg.Expression): E.Expression {
  if (!expr) { throw new Err.InvalidExpression(expr); }

  const types = Alg.expressionTypes;

  switch (expr.expressionType) {
    case types.TERM: return transformTerm(expr as Alg.TermExpression);
    case types.OPERATOR: return transformOperator(expr as Alg.OperatorExpression);
    case types.NAMED: return transformNamed(expr as Alg.NamedExpression);
    // TODO
    case types.EXISTENCE: throw new Err.UnimplementedError('Existence Operator');
    case types.AGGREGATE: throw new Err.UnimplementedError('Aggregate Operator');
    default: throw new Err.InvalidExpressionType(expr);
  }
}

export function transformTerm(term: Alg.TermExpression): E.Expression {
  if (!term.term) { throw new Err.InvalidExpression(term); }

  switch (term.term.termType) {
    case 'Variable': return new E.Variable(RDFString.termToString(term.term));
    case 'Literal': return tranformLiteral(term.term as RDF.Literal);
    case 'NamedNode': return new E.NamedNode(term.term.value);
    case 'BlankNode': return new E.BlankNode(term.term.value);
    default: throw new Err.InvalidTermType(term);
  }
}

// TODO: Maybe do this with a map?
// tslint:disable-next-line:no-any
function tranformLiteral(lit: RDF.Literal): E.Literal<any> {

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

    case DT.XSD_DATE_TIME: {
      const val: Date = new Date(lit.value);
      if (isNaN(val.getTime())) {
        return new E.NonLexicalLiteral(undefined, lit.value, lit.datatype);
      }
      return new E.DateTimeLiteral(new Date(lit.value), lit.value);
    }

    case DT.XSD_BOOLEAN: {
      if (lit.value !== 'true' && lit.value !== 'false') {
        return new E.NonLexicalLiteral(undefined, lit.value, lit.datatype);
      }
      return new E.BooleanLiteral(lit.value === 'true', lit.value);
    }

    case DT.XSD_INTEGER:
    case DT.XSD_DECIMAL:

    case DT.XSD_NEGATIVE_INTEGER:
    case DT.XSD_NON_NEGATIVE_INTEGER:
    case DT.XSD_NON_POSITIVE_INTEGER:
    case DT.XSD_POSITIVE_INTEGER:
    case DT.XSD_LONG:
    case DT.XSD_INT:
    case DT.XSD_SHORT:
    case DT.XSD_BYTE:
    case DT.XSD_UNSIGNED_LONG:
    case DT.XSD_UNSIGNED_INT:
    case DT.XSD_UNSIGNED_SHORT:
    case DT.XSD_UNSIGNED_BYTE:
    case DT.XSD_INT: {
      const val: number = P.parseXSDDecimal(lit.value);
      if (val === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.value, lit.datatype);
      }
      return new E.NumericLiteral(val, lit.value, lit.datatype);
    }
    case DT.XSD_FLOAT:
    case DT.XSD_DOUBLE: {
      const val: number = P.parseXSDFloat(lit.value);
      if (val === undefined) {
        return new E.NonLexicalLiteral(undefined, lit.value, lit.datatype);
      }
      return new E.NumericLiteral(val, lit.value, lit.datatype);
    }
    default: return new E.Literal<string>(lit.value, lit.value, lit.datatype);
  }
}

function transformOperator(expr: Alg.OperatorExpression)
  : E.OperatorExpression | E.SpecialOperatorExpression {
  if (C.SpecialOperators.contains(expr.operator)) {
    const op = expr.operator as C.SpecialOperator;
    const args = expr.args.map((a) => transformAlgebra(a));
    const func = specialFunctions.get(op);
    if (!hasCorrectArity(args, func.arity)) { throw new Err.InvalidArity(args, op); }
    return new E.SpecialOperatorAsync(args, func.apply);
  } else {
    if (!C.Operators.contains(expr.operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const op = expr.operator as C.RegularOperator;
    const args = expr.args.map((a) => transformAlgebra(a));
    const func = regularFunctions.get(op);
    if (!hasCorrectArity(args, func.arity)) { throw new Err.InvalidArity(args, op); }
    return new E.Operator(args, func.apply);
  }
}

export function transformNamed(expr: Alg.NamedExpression): E.NamedExpression {
  const funcName = expr.name.value;
  if (!C.NamedOperators.contains(funcName as C.NamedOperator)) {
    throw new Err.UnknownNamedOperator(expr.name.value);
  }

  // tslint:disable-next-line:no-any
  const op = expr.name.value as any as C.NamedOperator;
  const args = expr.args.map((a) => transformAlgebra(a));
  const func = namedFunctions.get(op);
  return new E.Named(expr.name, args, func.apply);
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
