import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../expressions';
import type { SparqlFunction } from '../functions';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import { expressionToVar } from '../functions/Helpers';
import type { FunctionArgumentsCache } from '../functions/OverloadTree';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type * as C from '../util/Consts';
import type { ITimeZoneRepresentation } from '../util/DateTimeHelpers';
import { extractTimeZone } from '../util/DateTimeHelpers';
import * as Err from '../util/Errors';
import type { SuperTypeCallback, TypeCache, ISuperTypeProvider } from '../util/TypeHandling';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorContext {
  exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  bnode: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  now?: Date;
  baseIRI?: string;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  functionArgumentsCache?: FunctionArgumentsCache;
  defaultTimeZone?: ITimeZoneRepresentation;
  actionContext: IActionContext;
}

export class InternalizedExpressionEvaluator {
  protected readonly transformer: AlgebraTransformer;

  private readonly subEvaluators: Record<string,
  (expr: E.Expression, mapping: RDF.Bindings) => Promise<E.Term> | E.Term> =
      {
        [E.ExpressionType.Term]: this.term.bind(this),
        [E.ExpressionType.Variable]: this.variable.bind(this),
        [E.ExpressionType.Operator]: this.evalFunction.bind(this),
        [E.ExpressionType.SpecialOperator]: this.evalFunction.bind(this),
        [E.ExpressionType.Named]: this.evalFunction.bind(this),
        [E.ExpressionType.Existence]: this.evalExistence.bind(this),
        [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
        [E.ExpressionType.AsyncExtension]: this.evalFunction.bind(this),
      };

  // Context items
  public readonly exists: (expression: Alg.ExistenceExpression, mapping: RDF.Bindings) => Promise<boolean>;
  public readonly bnode: (input?: string) => Promise<RDF.BlankNode>;
  public readonly extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  public readonly now: Date;
  public readonly baseIRI?: string;
  public readonly functionArgumentsCache: FunctionArgumentsCache;
  public readonly superTypeProvider: ISuperTypeProvider;
  public readonly defaultTimeZone: ITimeZoneRepresentation;
  public readonly actionContext: IActionContext;
  public readonly functions: Record<C.NamedOperator | C.Operator, SparqlFunction> = {
    ...namedFunctions,
    ...specialFunctions,
    ...regularFunctions,
  };

  public constructor(public algExpr: Alg.Expression, context: IAsyncEvaluatorContext) {
    this.now = context.now || new Date(Date.now());
    this.baseIRI = context.baseIRI || undefined;
    this.functionArgumentsCache = context.functionArgumentsCache || {};
    this.superTypeProvider = {
      cache: context.typeCache || new LRUCache({ max: 1_000 }),
      discoverer: context.getSuperType || (() => 'term'),
    };
    // eslint-disable-next-line unicorn/no-useless-undefined
    this.extensionFunctionCreator = context.extensionFunctionCreator || (() => undefined);
    this.exists = context.exists;
    this.bnode = context.bnode;
    this.defaultTimeZone = context.defaultTimeZone || extractTimeZone(this.now);
    this.actionContext = context.actionContext;

    this.transformer = new AlgebraTransformer(
      this.superTypeProvider,
      async({ functionName }) => {
        const res: SparqlFunction | undefined = this.functions[<C.NamedOperator | C.Operator> functionName];
        if (res) {
          return res;
        }
        throw new Error('nah!');
      },
    );
  }

  public async evaluateAsInternal(expr: E.Expression, mapping: RDF.Bindings): Promise<E.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private term(expr: E.Term, _: RDF.Bindings): E.Term {
    return expr;
  }

  private variable(expr: E.Variable, mapping: RDF.Bindings): E.Term {
    const term = mapping.get(expressionToVar(expr));
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.transformer.transformRDFTermUnsafe(term);
  }

  private async evalFunction(expr: E.Operator | E.SpecialOperator | E.Named | E.AsyncExtension, mapping: RDF.Bindings):
  Promise<E.Term> {
    return expr.apply({
      args: expr.args,
      mapping,
      exprEval: this,
    });
  }

  private async evalExistence(expr: E.Existence, mapping: RDF.Bindings): Promise<E.Term> {
    return new E.BooleanLiteral(await this.exists(expr.expression, mapping));
  }

  private evalAggregate(): never {
    throw new Err.NoAggregator();
  }
}
