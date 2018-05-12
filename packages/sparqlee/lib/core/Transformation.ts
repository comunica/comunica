import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import * as E from './Expressions';

import { DataType as DT } from '../util/Consts';
import { makeOp } from './functions/index';

export function transformAlgebra(expr: Alg.Expression): E.Expression {
  const types = Alg.expressionTypes;
  switch (expr.expressionType) {
    case types.TERM: return transformTerm(expr as Alg.TermExpression);
    case types.OPERATOR: {
      const opIn = expr as Alg.OperatorExpression;
      const args = opIn.args.map((a) => transformAlgebra(a));
      // NOTE: If abstracted, sync and async should be differentiated
      return makeOp(opIn.operator, args);
    }
    // TODO
    case types.NAMED: throw new Err.UnimplementedError();
    case types.EXISTENCE: throw new Err.UnimplementedError();
    case types.AGGREGATE: throw new Err.UnimplementedError();
    default: throw new Err.InvalidExpressionType(expr);
  }
}

export function transformTerm(term: Alg.TermExpression): E.Expression {
  switch (term.term.termType) {
    case 'Variable': return new E.Variable(term.term.value);
    case 'Literal': return tranformLiteral(term.term as RDF.Literal);
    // TODO
    case 'NamedNode': throw new Err.UnimplementedError();
    default: throw new Err.InvalidTermType(term);
  }
}

// TODO: Maybe do this with a map?
// tslint:disable-next-line:no-any
function tranformLiteral(lit: RDF.Literal): E.Literal<any> {

  if (!lit.datatype) {
    if (lit.language) { return new E.PlainLiteral(lit.value, lit.value, lit.language); }
    return new E.SimpleLiteral(lit.value, lit.value);
  }

  switch (lit.datatype.value) {
    case null:
    case undefined:
    case "": {
      if (lit.language) {
        return new E.PlainLiteral(lit.value, lit.value, lit.language);
      }
      return new E.SimpleLiteral(lit.value, lit.value);
    }

    case DT.XSD_STRING:
      return new E.StringLiteral(lit.value, lit.value, lit.datatype);
    case DT.RDF_LANG_STRING:
      return new E.PlainLiteral(lit.value, lit.value, lit.language);

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