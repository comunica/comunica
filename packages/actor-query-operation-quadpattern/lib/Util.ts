import { BindingsFactory, type Bindings } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { QuadTermName } from 'rdf-terms';
import { forEachTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();
const DF = new DataFactory();

export interface INestedElementVariables {
  /**
   * Element variables at the current Quad level
   */
  elementVariables?: Partial<Record<QuadTermName, string>>;
  /**
   * Element variables that are at a nested Quad level
   */
  nestedVariables?: Partial<Record<QuadTermName, INestedElementVariables>>;
}

export function getElementVariables(pattern: Algebra.Pattern | RDF.BaseQuad): INestedElementVariables | undefined {
  let nestedVariables: Partial<Record<QuadTermName, INestedElementVariables>> | undefined;
  let elementVariables: Partial<Record<QuadTermName, string>> | undefined;

  forEachTerms(pattern, (term, key) => {
    switch (term.termType) {
      case 'Variable': {
        (elementVariables ||= {})[key] = term.value;
        break;
      }
      case 'Quad': {
        const nesting = getElementVariables(term);
        if (nesting) {
          (nestedVariables ||= {})[key] = nesting;
        }
        break;
      }
      default:
        break;
    }
  });

  if (!nestedVariables && !elementVariables) {
    return undefined;
  }

  return {
    nestedVariables,
    elementVariables,
  };
}

export function getQuadBindings(quad: RDF.BaseQuad, nestedElementVariables?: INestedElementVariables): Bindings {
  const acc: [RDF.Variable, RDF.Term][] = [];

  function _getQuadBindings(_quad: RDF.BaseQuad, _nestedElementVariables: INestedElementVariables): void {
    let variable: string | INestedElementVariables | undefined;
    return forEachTerms(_quad, (term, key) => {
      // TODO: Optimise this; there are lots of uneccesary checks in the case that elementVariables or nestedVariables
      // is undefined.
      // eslint-disable-next-line no-cond-assign
      if (variable = _nestedElementVariables.elementVariables?.[key]) {
        acc.push([ DF.variable(variable), term ]);
      // eslint-disable-next-line no-cond-assign
      } else if (variable = _nestedElementVariables.nestedVariables?.[key]) {
        if (term.termType !== 'Quad') {
          throw new Error('Expected Quad');
        }
        _getQuadBindings(term, variable);
      }
    });
  }
  if (nestedElementVariables) {
    _getQuadBindings(quad, nestedElementVariables);
  }

  return BF.bindings(acc);
}
