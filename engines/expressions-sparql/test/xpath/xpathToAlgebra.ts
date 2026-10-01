import type { Algebra } from '@comunica/utils-algebra';
import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import type { SubTyped } from '@traqula/core';
import { TransformerSubTyped } from '@traqula/core';
import type { Expression, TermVariable } from '@traqula/rules-sparql-1-1';
import { AstFactory } from '@traqula/rules-sparql-1-2';
import { evaluateXPath, parseScript } from 'fontoxpath';
import { DataFactory } from 'rdf-data-factory';
import * as slimdom from 'slimdom';

const DF = new DataFactory();
const F = new AstFactory();
const toAlgebra = toAlgebra12Builder.build();

export const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * Thrown for XPath expressions that have no SPARQL equivalent, so the test can be skipped instead of failed.
 */
export class UnsupportedError extends Error {}

/**
 * An element of the XQueryX syntax tree (https://www.w3.org/TR/xqueryx-31/) of an XPath expression,
 * of which the children are transformed into SPARQL expressions.
 */
interface IXQueryXNode extends SubTyped<'xqueryx', string> {
  attributes: Record<string, string>;
  text: string;
  children: IXQueryXNode[];
}

const transformer = new TransformerSubTyped<IXQueryXNode>();

/**
 * The XSD types for which the expression engine has a cast function.
 */
const CAST_TYPES = new Set([
  'string',
  'boolean',
  'integer',
  'decimal',
  'float',
  'double',
  'dateTime',
  'date',
  'time',
  'duration',
  'dayTimeDuration',
  'yearMonthDuration',
]);

/**
 * The XSD types derived from xsd:integer, which the expression engine knows but has no cast function for.
 * Constructing them from a string literal results in a typed literal.
 */
const INTEGER_TYPES = new Set([
  'nonPositiveInteger',
  'negativeInteger',
  'long',
  'int',
  'short',
  'byte',
  'nonNegativeInteger',
  'unsignedLong',
  'unsignedInt',
  'unsignedShort',
  'unsignedByte',
  'positiveInteger',
]);

/**
 * XPath functions, by name and arity, mapped onto the SPARQL operators that the SPARQL specification defines with them.
 */
const FUNCTIONS: Record<string, { arities: number[]; operator: string }> = {
  abs: { arities: [ 1 ], operator: 'abs' },
  ceiling: { arities: [ 1 ], operator: 'ceil' },
  floor: { arities: [ 1 ], operator: 'floor' },
  round: { arities: [ 1 ], operator: 'round' },
  'string-length': { arities: [ 1 ], operator: 'strlen' },
  substring: { arities: [ 2, 3 ], operator: 'substr' },
  'upper-case': { arities: [ 1 ], operator: 'ucase' },
  'lower-case': { arities: [ 1 ], operator: 'lcase' },
  'starts-with': { arities: [ 2 ], operator: 'strstarts' },
  'ends-with': { arities: [ 2 ], operator: 'strends' },
  contains: { arities: [ 2 ], operator: 'contains' },
  'substring-before': { arities: [ 2 ], operator: 'strbefore' },
  'substring-after': { arities: [ 2 ], operator: 'strafter' },
  'encode-for-uri': { arities: [ 1 ], operator: 'encode_for_uri' },
  matches: { arities: [ 2, 3 ], operator: 'regex' },
  replace: { arities: [ 3, 4 ], operator: 'replace' },
  'year-from-dateTime': { arities: [ 1 ], operator: 'year' },
  'year-from-date': { arities: [ 1 ], operator: 'year' },
  'month-from-dateTime': { arities: [ 1 ], operator: 'month' },
  'month-from-date': { arities: [ 1 ], operator: 'month' },
  'day-from-dateTime': { arities: [ 1 ], operator: 'day' },
  'day-from-date': { arities: [ 1 ], operator: 'day' },
  'hours-from-dateTime': { arities: [ 1 ], operator: 'hours' },
  'hours-from-time': { arities: [ 1 ], operator: 'hours' },
  'minutes-from-dateTime': { arities: [ 1 ], operator: 'minutes' },
  'minutes-from-time': { arities: [ 1 ], operator: 'minutes' },
  'seconds-from-dateTime': { arities: [ 1 ], operator: 'seconds' },
  'seconds-from-time': { arities: [ 1 ], operator: 'seconds' },
  'timezone-from-dateTime': { arities: [ 1 ], operator: 'timezone' },
  not: { arities: [ 1 ], operator: '!' },
};

/**
 * The XQueryX elements of XPath operators, mapped onto the SPARQL operators that they correspond to.
 */
const OPERATORS: Record<string, string> = {
  orOp: '||',
  andOp: '&&',
  eqOp: '=',
  neOp: '!=',
  ltOp: '<',
  leOp: '<=',
  gtOp: '>',
  geOp: '>=',
  equalOp: '=',
  notEqualOp: '!=',
  lessThanOp: '<',
  lessThanOrEqualOp: '<=',
  greaterThanOp: '>',
  greaterThanOrEqualOp: '>=',
  addOp: '+',
  subtractOp: '-',
  multiplyOp: '*',
  divOp: '/',
  unaryMinusOp: 'uminus',
  unaryPlusOp: 'uplus',
};

/**
 * The XQueryX elements that only group the parts of an expression.
 */
const GROUPING_ELEMENTS = new Set([
  'firstOperand',
  'secondOperand',
  'operand',
  'arguments',
  'argExpr',
  'ifClause',
  'thenClause',
  'elseClause',
  'functionName',
  'singleType',
  'atomicType',
  'optional',
  'value',
  'name',
]);

function toNode(element: slimdom.Element): IXQueryXNode {
  return {
    type: 'xqueryx',
    subType: element.localName,
    attributes: Object.fromEntries(element.attributes.map(attribute => [ attribute.localName, attribute.value ])),
    text: element.textContent ?? '',
    children: element.children.map(toNode),
  };
}

/**
 * Parse an XPath expression into the XQueryX syntax tree of its body.
 */
function parse(xpath: string): IXQueryXNode {
  let module: slimdom.Element;
  try {
    module = parseScript<slimdom.Element>(
      xpath,
      { language: evaluateXPath.XPATH_3_1_LANGUAGE, annotateAst: false },
      new slimdom.Document(),
    );
  } catch (error: unknown) {
    throw new UnsupportedError(`Invalid XPath: ${(<Error> error).message.split('\n')[0]}`);
  }
  const queryBody = module.getElementsByTagNameNS('http://www.w3.org/2005/XQueryX', 'queryBody')[0];
  return toNode(queryBody.children[0]);
}

/**
 * The SPARQL expression of the part of an XQueryX element with the given name.
 */
function part(node: IXQueryXNode, name: string): Expression {
  return <Expression> <unknown> node.children.find(child => child.subType === name)!.children[0];
}

/**
 * Create a SPARQL literal, given its lexical form and the local name of its XSD datatype.
 */
function literal(value: string, datatype: string): Expression {
  return F.termLiteral(F.gen(), value, datatype === 'string' ? undefined : F.termNamed(F.gen(), `${XSD}${datatype}`));
}

/**
 * Create the SPARQL equivalent of an XPath cast to the type with the given prefixed name.
 */
function cast(typeName: string, expression: Expression): Expression {
  const [ prefix, localName ] = typeName.split(':');
  if (prefix !== 'xs') {
    throw new UnsupportedError(`Unsupported cast type ${typeName}`);
  }
  if (CAST_TYPES.has(localName)) {
    return F.expressionFunctionCall(F.termNamed(F.gen(), `${XSD}${localName}`), [ expression ], false, F.gen());
  }
  // Integer types have no cast function, but a string literal can become a typed literal.
  // Other types, such as xs:untypedAtomic and xs:anyURI, are not SPARQL operand types.
  if (INTEGER_TYPES.has(localName) && F.isTermLiteralStr(expression)) {
    return literal(expression.value, localName);
  }
  throw new UnsupportedError(`Unsupported cast type ${typeName}`);
}

/**
 * Create the SPARQL equivalent of a call of the XPath function with the given prefixed name.
 */
function functionCall(name: string, args: Expression[]): Expression {
  const [ prefix, localName ] = name.split(':');
  if (prefix === 'xs' && args.length === 1) {
    return cast(name, args[0]);
  }
  if (prefix !== 'fn') {
    throw new UnsupportedError(`Unsupported function ${name}`);
  }
  if ((localName === 'true' || localName === 'false') && args.length === 0) {
    return literal(localName, 'boolean');
  }
  if (localName === 'boolean' && args.length === 1) {
    // The effective boolean value, as negating twice
    return F.expressionOperation('!', [ F.expressionOperation('!', args, F.gen()) ], F.gen());
  }
  if (localName === 'string' && args.length === 1) {
    // The string value of an atomic value is its cast to xs:string
    return cast('xs:string', args[0]);
  }
  if (localName === 'concat' && args.length >= 2) {
    // XPath converts the arguments to strings, while SPARQL only accepts strings
    return F.expressionOperation('concat', args.map(arg => cast('xs:string', arg)), F.gen());
  }
  const definition = FUNCTIONS[localName];
  if (!definition?.arities.includes(args.length)) {
    throw new UnsupportedError(`Unsupported function ${name}#${args.length}`);
  }
  return F.expressionOperation(definition.operator, args, F.gen());
}

/**
 * Translate an XPath expression into a SPARQL expression, as a Traqula syntax tree.
 * The XQueryX syntax tree is transformed bottom-up, so the children of an element are SPARQL expressions already.
 * @param xpath The XPath expression.
 * @param variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
export function xpathToSparql(xpath: string, variables: Record<string, Expression> = {}): Expression {
  return transformer.transformNodeSpecific<'unsafe', Expression>(parse(xpath), {
    xqueryx: {
      transform(node) {
        if (OPERATORS[node.subType]) {
          return F.expressionOperation(
            OPERATORS[node.subType],
            node.subType.startsWith('unary') ?
                [ part(node, 'operand') ] :
                [ part(node, 'firstOperand'), part(node, 'secondOperand') ],
            F.gen(),
          );
        }
        if (!GROUPING_ELEMENTS.has(node.subType)) {
          throw new UnsupportedError(`Unsupported ${node.subType}`);
        }
        return node;
      },
    },
  }, {
    xqueryx: {
      integerConstantExpr: { transform: ({ text }) => literal(text, 'integer') },
      decimalConstantExpr: { transform: ({ text }) => literal(text, 'decimal') },
      doubleConstantExpr: { transform: ({ text }) => literal(text, 'double') },
      stringConstantExpr: { transform: ({ text }) => literal(text, 'string') },
      varRef: {
        transform({ text }) {
          if (!variables[text]) {
            throw new UnsupportedError(`Unknown variable $${text}`);
          }
          return variables[text];
        },
      },
      ifThenElseExpr: {
        transform: node => F.expressionOperation('if', [
          part(node, 'ifClause'),
          part(node, 'thenClause'),
          part(node, 'elseClause'),
        ], F.gen()),
      },
      castExpr: {
        transform(node) {
          const singleType = node.children.find(child => child.subType === 'singleType')!;
          const [ atomicType, optional ] = singleType.children;
          if (optional) {
            throw new UnsupportedError('Unsupported cast to an optional type');
          }
          return cast(`${atomicType.attributes.prefix}:${atomicType.text}`, part(node, 'argExpr'));
        },
      },
      functionCallExpr: {
        transform(node) {
          const [ functionName, args ] = node.children;
          return functionCall(
            `${functionName.attributes.prefix || 'fn'}:${functionName.text}`,
            <Expression[]> <unknown> args.children,
          );
        },
      },
    },
  });
}

/**
 * Translate an XPath expression into SPARQL algebra,
 * in the same way as the algebra of the expressions in a SPARQL query.
 * @param xpath The XPath expression.
 * @param variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
export function xpathToAlgebra(xpath: string, variables: Record<string, Expression> = {}): Algebra.Expression {
  return <Algebra.Expression> toAlgebra
    .translateExpression(createAlgebraContext({ dataFactory: DF }), xpathToSparql(xpath, variables));
}

/**
 * Create a SPARQL variable, to refer to in the variables of {@link xpathToSparql}.
 */
export function sparqlVariable(name: string): TermVariable {
  return F.termVariable(name, F.gen());
}
