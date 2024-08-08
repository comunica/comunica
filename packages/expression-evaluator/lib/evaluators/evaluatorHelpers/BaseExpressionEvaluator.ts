import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type * as E from '../../expressions/index.js';
import { expressionToVar } from '../../functions/Helpers.js';
import type { FunctionArgumentsCache } from '../../functions/OverloadTree.js';
import type { ITermTransformer } from '../../transformers/TermTransformer.js';
import type { ITimeZoneRepresentation } from '../../util/DateTimeHelpers.js';
import * as Err from '../../util/Errors.js';
import type { ISuperTypeProvider, SuperTypeCallback, TypeCache } from '../../util/TypeHandling.js';

export interface ISharedContext {
  now?: Date;
  baseIRI?: string;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  functionArgumentsCache?: FunctionArgumentsCache;
  defaultTimeZone?: ITimeZoneRepresentation;
  dataFactory: ComunicaDataFactory;
}

export interface ICompleteSharedContext {
  now: Date;
  baseIRI?: string;
  functionArgumentsCache: FunctionArgumentsCache;
  superTypeProvider: ISuperTypeProvider;
  defaultTimeZone: ITimeZoneRepresentation;
  dataFactory: ComunicaDataFactory;
}

export class BaseExpressionEvaluator {
  public constructor(
    protected readonly termTransformer: ITermTransformer,
    protected readonly dataFactory: ComunicaDataFactory,
  ) {}

  protected term(expr: E.Term): E.Term {
    return expr;
  }

  protected variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(this.dataFactory, expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.termTransformer.transformRDFTermUnsafe(term);
  }
}
