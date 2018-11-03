import * as RDF from 'rdf-js';
import * as RDFString from 'rdf-string';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import * as E from './Expressions';

import { TypeURL as DT } from '../util/Consts';
import { functions, RegularFunc } from './functions';
import { SpecialFunc } from './functions/SpecialFunctionsAsync';

export function transformAlgebra(expr: Alg.Expression): E.Expression {
  if (!expr) { throw new Err.InvalidExpression(expr); }

  const types = Alg.expressionTypes;

  switch (expr.expressionType) {
    case types.TERM: return transformTerm(expr as Alg.TermExpression);
    case types.OPERATOR: return transformOperator(expr as Alg.OperatorExpression);
    // TODO
    case types.NAMED: throw new Err.UnimplementedError('Named Operator');
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
    case 'BlankNode': throw new Err.UnimplementedError('Blank Node');
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
      return new E.DateTimeLiteral(new Date(lit.value), lit.value, lit.datatype);
    }

    case DT.XSD_BOOLEAN: {
      if (lit.value !== 'true' && lit.value !== 'false') {
        return new E.NonLexicalLiteral(undefined, lit.value, lit.datatype);
      }
      const val: boolean = JSON.parse(lit.value);
      return new E.BooleanLiteral(val, lit.value, lit.datatype);
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
      const val: number = P.parseXSDInteger(lit.value);
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

  if (!C.OperatorsAll.contains(expr.operator)) {
    // TODO Throw better error
    throw new Err.UnimplementedError(expr.operator);
  }

  const op = expr.operator as C.OperatorAll;
  const args = expr.args.map((a) => transformAlgebra(a));
  const _func = functions.get(expr.operator as C.OperatorAll);

  if (!hasCorrectArity(args, _func.arity)) { throw new Err.InvalidArity(args, op); }

  switch (_func.functionClass) {
    case 'special': {
      const func = _func as SpecialFunc;
      const expressionType = E.ExpressionType.SpecialOperator;
      return { func, args, expressionType };
    }
    case 'regular': {
      const func = _func as RegularFunc;
      const expressionType = E.ExpressionType.Operator;
      return { func, args, expressionType };
    }
    default: throw new Err.UnexpectedError('Unknown function class');
  }
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
