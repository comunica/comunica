/* eslint-disable id-length */
import type { Bindings } from '@comunica/types';
import type * as RDF from 'rdf-js';
import { stringToTerm, termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * Creates an evaluator function that executes the given Sxpression on the given Bindings.
 * This implementation is copied from the original LDF Client implementation.
 * THIS IMPLEMENTATION IS NOT FULLY SPEC COMPATIBLE!!!
 * But covers most of the standard cases.
 * @param {Expression} expr
 * @returns {(bindings: Bindings) => Term}
 */
export function createEvaluator(expr: Algebra.Expression): (bindings: Bindings) => (RDF.Term | undefined) {
  const func = handleExpression(expr);
  // Internally the expression evaluator uses primitives, so these have to be converted back
  return (bindings: Bindings) => {
    const str = func(bindings);
    if (!str) {
      return;
    }
    return stringToTerm(str);
  };
}

function handleExpression(expr: Algebra.Expression): (bindings: Bindings) => (string | undefined) {
  if (expr.expressionType === Algebra.expressionTypes.TERM) {
    return handleTermExpression(<Algebra.TermExpression>expr);
  }

  if (expr.expressionType === Algebra.expressionTypes.NAMED) {
    return handleNamedExpression(<Algebra.NamedExpression>expr);
  }

  if (expr.expressionType === Algebra.expressionTypes.OPERATOR) {
    return handleOperatorExpression(<Algebra.OperatorExpression>expr);
  }

  throw new Error(`Unsupported Expression type: ${expr.expressionType}`);
}

function handleTermExpression(expr: Algebra.TermExpression): (bindings: Bindings) => (string | undefined) {
  if (expr.term.termType === 'Variable') {
    return bindings => {
      const str = termToString(expr.term);
      return bindings.has(str) ? termToString(bindings.get(str)) : undefined;
    };
  }
  const str = termToString(expr.term);
  return () => str;
}

function handleNamedExpression(expr: Algebra.NamedExpression): (bindings: Bindings) => string {
  return handleFunction(expr.name.value, expr.args);
}

function handleOperatorExpression(expr: Algebra.OperatorExpression): (bindings: Bindings) => string {
  return handleFunction(expr.operator, expr.args);
}

function handleFunction(operatorName: string, args: Algebra.Expression[]): (bindings: Bindings) => string {
  const op = operators[operatorName];
  if (!op) {
    throw new Error(`Unsupported operator ${operatorName}`);
  }

  // Special case: some operators accept expressions instead of evaluated expressions
  if (op.acceptsExpressions) {
    return ((operator: any, unparsedArgs) => (bindings: Bindings) => operator.apply(bindings, unparsedArgs))(op, args);
  }

  const funcArgs = args.map(handleExpression);

  return ((operator: any,
    argumentExpressions: ((bindings: Bindings) => (string | undefined))[]) => (bindings: Bindings): string => {
    // Evaluate the arguments
    const resolvedArgs: (number | boolean | string | undefined)[] = new Array(argumentExpressions.length);
    const origArgs: (string | undefined)[] = new Array(argumentExpressions.length);
    for (const [ i, element ] of argumentExpressions.entries()) {
      const arg = resolvedArgs[i] = origArgs[i] = element(bindings);
      // Convert the arguments if necessary
      switch (operator.type) {
        case 'numeric':
          resolvedArgs[i] = arg ? Number.parseFloat(literalValue(arg)) : undefined;
          break;
        case 'boolean':
          resolvedArgs[i] = arg !== XSD_FALSE &&
            (!isLiteral(arg) || literalValue(arg) !== '0');
          break;
      }
    }
    // Call the operator on the evaluated arguments
    // eslint-disable-next-line prefer-spread
    const result = operator.apply(null, resolvedArgs);
    // Convert result if necessary
    switch (operator.resultType) {
      case 'numeric':
        // eslint-disable-next-line no-case-declarations
        let type = origArgs[0] ? getLiteralType(origArgs[0]) : undefined;
        if (!type || type === XSD_STRING) {
          type = XSD_INTEGER;
        }
        return `"${result}"^^${type}`;
      case 'boolean':
        return result ? XSD_TRUE : XSD_FALSE;
      default:
        return result;
    }
  })(op, funcArgs);
}

function isLiteral(entity: any): entity is string {
  return typeof entity === 'string' && entity.startsWith('"');
}

function literalValue(literal: string): string {
  const match = /^"([^]*)"/u.exec(literal);
  return (match && match[1]) || '';
}

function getLiteralType(literal: string): string {
  const match = /^"[^]*"(?:\^\^([^"]+)|(@)[^"@]+)?$/u.exec(literal);
  return (match && match[1]) ?? (match && match[2] ?
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' :
    'http://www.w3.org/2001/XMLSchema#string');
}

function getLiteralLanguage(literal: string): string {
  const match = /^"[^]*"(?:@([^"@]+)|\^\^[^"]+)?$/u.exec(literal);
  return match && match[1] ? match[1].toLowerCase() : '';
}

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const XSD_INTEGER = `${XSD}integer`;
const XSD_DOUBLE = `${XSD}double`;
const XSD_BOOLEAN = `${XSD}boolean`;
const XSD_STRING = `${XSD}string`;
const XSD_TRUE = `"true"^^${XSD_BOOLEAN}`;
const XSD_FALSE = `"false"^^${XSD_BOOLEAN}`;

// Operators for each of the operator types
const operators: any = {
  '+'(a: number, b: number): number {
    return a + b;
  },
  '-'(a: number, b: number): number {
    return a - b;
  },
  '*'(a: number, b: number): number {
    return a * b;
  },
  '/'(a: number, b: number): number {
    return a / b;
  },
  '='(a: any, b: any): boolean {
    return a === b;
  },
  '!='(a: any, b: any): boolean {
    return a !== b;
  },
  '<'(a: number, b: number): boolean {
    return a < b;
  },
  '<='(a: number, b: number): boolean {
    return a <= b;
  },
  '>'(a: number, b: number): boolean {
    return a > b;
  },
  '>='(a: number, b: number): boolean {
    return a >= b;
  },
  '!'(a: boolean): boolean {
    return !a;
  },
  '&&'(a: boolean, b: boolean): boolean {
    return a && b;
  },
  '||'(a: boolean, b: boolean): boolean {
    return a || b;
  },
  'lang'(a: any): string | undefined {
    return isLiteral(a) ? `"${getLiteralLanguage(a).toLowerCase()}"` : undefined;
  },
  'langmatches'(langTag: string, langRange: string): boolean {
    // Implements https://tools.ietf.org/html/rfc4647#section-3.3.1
    if (!langTag || !langRange) {
      return false;
    }
    langTag = langTag.toLowerCase();
    langRange = langRange.toLowerCase();
    // eslint-disable-next-line no-return-assign
    return langTag === langRange ||
      ((langRange = literalValue(langRange)) === '*' && Boolean(langTag)) ||
      // eslint-disable-next-line unicorn/prefer-string-slice
      langTag.substr(1, langRange.length + 1) === `${langRange}-`;
  },
  'contains'(str: string, substring: string) {
    substring = literalValue(substring);
    str = literalValue(str);
    return str.includes(substring);
  },
  'regex'(subject: string, pattern: string): boolean {
    if (isLiteral(subject)) {
      subject = literalValue(subject);
    }
    // eslint-disable-next-line require-unicode-regexp
    return new RegExp(literalValue(pattern)).test(subject);
  },
  'str'(a: any): string {
    return isLiteral(a) ? a : `"${a}"`;
  },
  'http://www.w3.org/2001/XMLSchema#integer'(a: number): string {
    return `"${Math.floor(a)}"^^http://www.w3.org/2001/XMLSchema#integer`;
  },
  'http://www.w3.org/2001/XMLSchema#double'(a: number): string {
    let str = a.toString();
    if (!str.includes('.')) {
      str += '.0';
    }
    return `"${str}"^^http://www.w3.org/2001/XMLSchema#double`;
  },
  'bound'(a: Algebra.Expression): string {
    if (a.expressionType !== 'term') {
      throw new Error(`BOUND expects a TermExpression but got: ${JSON.stringify(a)}`);
    }
    const { term } = <Algebra.TermExpression> a;
    if (term.termType !== 'Variable') {
      throw new Error(`BOUND expects a Variable but got: ${JSON.stringify(term)}`);
    }
    return this.has(termToString(term)) ? XSD_TRUE : XSD_FALSE;
  },
};

// Tag all operators that expect their arguments to be numeric
[
  '+', '-', '*', '/', '<', '<=', '>', '>=',
  XSD_INTEGER, XSD_DOUBLE,
].forEach(operatorName => {
  operators[operatorName].type = 'numeric';
});

// Tag all operators that expect their arguments to be boolean
[
  '!', '&&', '||',
].forEach(operatorName => {
  operators[operatorName].type = 'boolean';
});

// Tag all operators that have numeric results
[
  '+', '-', '*', '/',
].forEach(operatorName => {
  operators[operatorName].resultType = 'numeric';
});

// Tag all operators that have boolean results
[
  '!', '&&', '||', '=', '!=', '<', '<=', '>', '>=',
  'langmatches', 'contains', 'regex',
].forEach(operatorName => {
  operators[operatorName].resultType = 'boolean';
});

// Tag all operators that take expressions instead of evaluated expressions
operators.bound.acceptsExpressions = true;
