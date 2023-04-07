import type * as RDF from '@rdfjs/types';
import type * as LRUCache from 'lru-cache';
import type * as E from '../../expressions';
import { expressionToVar } from '../../functions/Helpers';
import type { FunctionArgumentsCache } from '../../functions/OverloadTree';
import type { ITermTransformer } from '../../transformers/TermTransformer';
import type { ITimeZoneRepresentation } from '../../util/DateTimeHelpers';
import * as Err from '../../util/Errors';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache } from '../../util/TypeHandling';

export interface ISharedContext {
  now?: Date;
  baseIRI?: string;
  /**
   * @deprecated This value is unused, will be removed in the next major version.
   */
  overloadCache?: LRUCache<string, any>;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  /**
   * @deprecated This value is unused (extended XSD types is always enabled), will be removed in the next major version.
   */
  enableExtendedXsdTypes?: boolean;
  functionArgumentsCache?: FunctionArgumentsCache;
  defaultTimeZone?: ITimeZoneRepresentation;
}

export interface ICompleteSharedContext {
  now: Date;
  baseIRI?: string;
  functionArgumentsCache: FunctionArgumentsCache;
  superTypeProvider: ISuperTypeProvider;
  defaultTimeZone: ITimeZoneRepresentation;
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
