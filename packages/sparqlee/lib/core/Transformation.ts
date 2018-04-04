import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import * as E from './Expressions';

import { DataType as DT } from '../util/Consts';
import { makeOp } from './operators/index';

export function transformAlgebra(expr: Alg.Expression): E.Expression {
  const types = Alg.expressionTypes;
  switch (expr.expressionType) {
    case types.TERM: return transformTerm(<Alg.TermExpression> expr);
    case types.OPERATOR: {
      const opIn = <Alg.OperatorExpression> expr;
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
    case 'Literal': return tranformLiteral(<RDF.Literal> term.term);
    // TODO
    case 'NamedNode': throw new Err.UnimplementedError();
    default: throw new Err.InvalidTermType(term);
  }
}

// TODO: Maybe do this with a map?
function tranformLiteral(lit: RDF.Literal): E.Literal<any> {
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
      return new E.Literal<string>(lit.value, lit.value, lit.datatype, lit.language);

    case DT.XSD_DATE_TIME: {
      const val: Date = new Date(lit.value);
      if (isNaN(val.getTime())) {
        return new E.NonLexicalLiteral(lit.value, lit.value, lit.datatype);
      }
      return new E.DateTimeLiteral(new Date(lit.value), lit.value, lit.datatype);
    }

    case DT.XSD_BOOLEAN: {
      const val: boolean = JSON.parse(lit.value);
      // TODO: Fix: shouldn't error immediately, might require big changes
      // TODO: This might cause silent errors, and behaviour when typedVal
      // is undefined might be weird; Maybe errorType?
      // Advantage is, unless operator is defined for plain literal,
      // it will raise a type error;
      if (typeof val !== 'boolean') {
        return new E.NonLexicalLiteral(val, lit.value, lit.datatype);
      }
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
        return new E.NonLexicalLiteral(val, lit.value, lit.datatype);
      }
      return new E.NumericLiteral(val, lit.value, lit.datatype);
    }
    case DT.XSD_FLOAT:
    case DT.XSD_DOUBLE: {
      const val: number = P.parseXSDFloat(lit.value);
      if (val === undefined) {
        return new E.NonLexicalLiteral(val, lit.value, lit.datatype);
      }
      return new E.NumericLiteral(val, lit.value, lit.datatype);
    }
    default: return new E.Literal<string>(lit.value, lit.value, lit.datatype);
  }
}