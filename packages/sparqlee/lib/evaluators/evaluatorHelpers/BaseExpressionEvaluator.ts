import type * as RDF from '@rdfjs/types';
import type * as E from '../../expressions';
import { expressionToVar } from '../../functions/Helpers';
import type { OverLoadCache } from '../../functions/OverloadTree';
import type { ITermTransformer } from '../../transformers/TermTransformer';
import * as Err from '../../util/Errors';
import type { SuperTypeCallback, TypeCache, ISuperTypeProvider } from '../../util/TypeHandling';

export interface ISharedContext {
  now?: Date;
  baseIRI?: string;
  overloadCache?: OverLoadCache;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  /**
   * This feature is opt in. It activates the use of a new 'experimental' type system.
   * This system is needed when using typeCache, overloadCache or getSuperType.
   * The system is more powerful and reliable. In most cases however the old system works perfectly.
   * Using this experimental system makes sparqlee a bit slower but more reliable using type promotion for example.
   */
  enableExtendedXsdTypes?: boolean;
}

export interface ICompleteSharedContext {
  now: Date;
  baseIRI?: string;
  overloadCache: OverLoadCache;
  superTypeProvider: ISuperTypeProvider;
  enableExtendedXsdTypes: boolean;
}

export class BaseExpressionEvaluator {
  public constructor(protected readonly termTransformer: ITermTransformer) { }

  protected term(expr: E.Term, mapping: RDF.Bindings): E.Term {
    return expr;
  }

  protected variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.termTransformer.transformRDFTermUnsafe(term);
  }
}
