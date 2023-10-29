import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation, materializeOperation } from '@comunica/bus-query-operation';
import type { FunctionBusType, IActionContext, TermFunctionBusType } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../expressions';
import { expressionToVar } from '../functions/Helpers';
import type { FunctionArgumentsCache } from '../functions/OverloadTree';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type { ITimeZoneRepresentation } from '../util/DateTimeHelpers';
import { extractTimeZone } from '../util/DateTimeHelpers';
import * as Err from '../util/Errors';
import type { SuperTypeCallback, TypeCache, ISuperTypeProvider } from '../util/TypeHandling';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorContext {
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  now?: Date;
  baseIRI?: string;
  typeCache?: TypeCache;
  getSuperType?: SuperTypeCallback;
  functionArgumentsCache?: FunctionArgumentsCache;
  defaultTimeZone?: ITimeZoneRepresentation;
  actionContext: IActionContext;
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorTermFunction: TermFunctionBusType;
  mediatorFunction: FunctionBusType;
}

/**
 * This class provides evaluation functionality to already transformed expressions.
 * It also holds all context items needed for evaluating functions.
 */
export class ContextualizedEvaluator {
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
  public readonly extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  public readonly now: Date;
  public readonly baseIRI?: string;
  public readonly functionArgumentsCache: FunctionArgumentsCache;
  public readonly superTypeProvider: ISuperTypeProvider;
  public readonly defaultTimeZone: ITimeZoneRepresentation;
  public readonly actionContext: IActionContext;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorTermFunction: TermFunctionBusType;
  public readonly mediatorFunction: FunctionBusType;

  public constructor(context: IAsyncEvaluatorContext) {
    this.now = context.now || new Date(Date.now());
    this.baseIRI = context.baseIRI || undefined;
    this.functionArgumentsCache = context.functionArgumentsCache || {};
    this.superTypeProvider = {
      cache: context.typeCache || new LRUCache({ max: 1_000 }),
      discoverer: context.getSuperType || (() => 'term'),
    };
    // eslint-disable-next-line unicorn/no-useless-undefined
    this.extensionFunctionCreator = context.extensionFunctionCreator || (() => undefined);
    this.defaultTimeZone = context.defaultTimeZone || extractTimeZone(this.now);
    this.actionContext = context.actionContext;
    this.mediatorQueryOperation = context.mediatorQueryOperation;
    this.mediatorTermFunction = context.mediatorTermFunction;
    this.mediatorFunction = context.mediatorFunction;

    this.transformer = new AlgebraTransformer(
      this.superTypeProvider,
      this.mediatorFunction,
    );
  }

  public translate(algExpr: Alg.Expression): Promise<E.Expression> {
    return this.transformer.transformAlgebra(algExpr);
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
    const operation = materializeOperation(expr.expression.input, mapping);

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation, context: this.actionContext });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    return await new Promise(
      (resolve, reject) => {
        output.bindingsStream.on('end', () => {
          resolve(false);
        });

        output.bindingsStream.on('error', reject);

        output.bindingsStream.on('data', () => {
          output.bindingsStream.close();
          resolve(true);
        });
      },
    )
      .then((exists: boolean) => expr.expression.not ? !exists : exists)
      .then((exists: boolean) => new E.BooleanLiteral(exists));
  }

  private evalAggregate(): never {
    throw new Err.NoAggregator();
  }
}
