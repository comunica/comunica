import { RegularFunction } from '@comunica/bus-function-factory';
import type {
  NumericLiteral,

  LangStringLiteral,
} from '@comunica/expression-evaluator';
import {
  RegularOperator,
  TypeURL,
  declare,
  langString,
  string,
} from '@comunica/expression-evaluator';

/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
export class SubStr extends RegularFunction {
  protected arity = [ 2, 3 ];
  public operator = RegularOperator.SUBSTR;

  protected overloads = declare(RegularOperator.SUBSTR)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number) => string([ ...source ].slice(startingLoc - 1).join('')),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
      () => (source: LangStringLiteral, startingLoc: NumericLiteral) => {
        const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1).join('');
        return langString(sub, source.language);
      },
    )
    .onTernaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number, length: number) =>
        string([ ...source ].slice(startingLoc - 1, length + startingLoc - 1).join('')),
    )
    .onTernary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: LangStringLiteral, startingLoc: NumericLiteral, length: NumericLiteral) => {
        const sub = [ ...source.typedValue ]
          .slice(startingLoc.typedValue - 1, length.typedValue + startingLoc.typedValue - 1)
          .join('');
        return langString(sub, source.language);
      },
    )
    .collect();
}
