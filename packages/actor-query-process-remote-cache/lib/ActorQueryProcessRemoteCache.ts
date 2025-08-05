import { ActorQueryProcess, IActionQueryProcess, IActorQueryProcessOutput, IActorQueryProcessArgs } from '@comunica/bus-query-process';
import { TestResult, IActorTest, passTestVoid, ActionContextKey } from '@comunica/core';
import { KeyRemoteCache, KeysInitQuery } from '@comunica/context-entries';
import { Algebra, toSparql, translate, Util } from 'sparqlalgebrajs';
import {
  CacheHitFunction,
  getCachedQuads,
  type CacheLocation,
  IOptions,
  OutputOption,
} from 'sparql-cache-client';
import { isError, error, SafePromise, result, isResult } from 'result-interface';
import { Bindings, BindingsStream, ComunicaDataFactory, QuerySourceUnidentified } from '@comunica/types';
import { RdfStore } from 'rdf-stores';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { bindTemplateWithProjection } from './bindTemplateWithProjection';
import { IBindings } from 'sparqljson-parse';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import { isContained, ISolverOption, SEMANTIC } from 'sparql-federated-query-containment';
import * as Z3_SOLVER from "z3-solver";

const RDF_FACTORY: ComunicaDataFactory = new DataFactory();
const BF = new BindingsFactory(RDF_FACTORY);

/**
 * A comunica Remote Cache Query Process Actor.
 */
export class ActorQueryProcessRemoteCache extends ActorQueryProcess {
  private readonly fallBackQueryProcess: ActorQueryProcess;
  public readonly cacheHitAlgorithm: Algorithm;

  public constructor(args: IActorQueryProcessRemoteCacheArgs) {
    super(args);
  }

  public async test(_action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }


  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    const resultOrError = await this.queryCachedResults(action);
    if (isResult(resultOrError)) {
      this.logDebug(action.context, `using the remote cache from: ${JSON.stringify(action.context.getSafe(KeyRemoteCache.location), null, 2)}`,)
      if ("stores" in resultOrError.value) {
        action.context = action.context.set(KeysInitQuery.querySourcesUnidentified, resultOrError.value.stores);
      } else {
        return {
          result: {
            type: 'bindings',
            bindingsStream: resultOrError.value.bindings,
            metadata: () => {
              return new Promise((resolve) => { resolve(<any>"cached bindings") })
            }
          }
        }
      }
    } else {
      this.logDebug(action.context, "query not found in the cache performing the full execution")
    }
    return this.fallBackQueryProcess.run(action, undefined);
  }

  public static async equalityCacheHit(q1: Readonly<Algebra.Operation>,
    q2: Readonly<Algebra.Operation>,
    _options?: IOptions): SafePromise<boolean> {
    return result(toSparql(q1) === toSparql(q2))
  }

  public async generateQueryContainmentCacheHitFunction(): Promise<CacheHitFunction> {
    const Z3 = await Z3_SOLVER.init();

    return async (q1: Readonly<Algebra.Operation>, q2: Readonly<Algebra.Operation>, options?: IOptions): SafePromise<boolean> => {
      const option: ISolverOption = options === undefined ? {
        sources: [],
        semantic: SEMANTIC.BAG_SET,
        z3: Z3
      } : {
        ...options,
        semantic: SEMANTIC.BAG_SET,
        z3: Z3
      }
        ;
      const resp = await isContained(q1, q2, option);
      if (isError(resp)) {
        return error(new Error(resp.error));
      }
      return result(resp.value.result);
    }

  }

  private async getCacheHitAlgorithm(): SafePromise<CacheHitFunction> {
    switch (this.cacheHitAlgorithm) {
      case 'equality':
        return result(ActorQueryProcessRemoteCache.equalityCacheHit);
      case 'containment':
        return result(await this.generateQueryContainmentCacheHitFunction());
      default:
        return error(new Error(`algorithm ${this.cacheHitAlgorithm} not supported`));
    }

  }

  public async queryCachedResults(action: IActionQueryProcess): SafePromise<CachingResult> {
    const cacheLocation: CacheLocation | undefined = action.context.get(KeyRemoteCache.location);
    if (cacheLocation === undefined) {
      return error(new Error("cache URL does not exist"));
    }


    const query: Algebra.Operation = typeof action.query === 'string' ? translate(action.query) : action.query;

    const sources: any[] = action.context.get(new ActionContextKey("sources")) ?? [];
    const endpoints: string[] = [];
    const rdfStores: RDF.Store[] = [];

    for (const source of sources) {
      if (typeof source === 'string') {
        endpoints.push(source);
      } else if ('value' in source && typeof source.value === 'string') {
        endpoints.push(source.value);
      } else if (this.isRdfStore(source)) {
        rdfStores.push(source);
      }
    }

    const cacheHitAlgorithm = await this.getCacheHitAlgorithm();

    if (isError(cacheHitAlgorithm)) {
      return cacheHitAlgorithm;
    }

    const input = {
      cache: cacheLocation,
      query,
      // Only includes non-SERVICE endpoint(s)
      endpoints,
      cacheHitAlgorithms: [
        {
          algorithm: cacheHitAlgorithm.value,
          time_limit: 1_000 // 1 second
        }
      ],
      maxConcurentExecCacheHitAlgorithm: undefined,

      outputOption: OutputOption.BINDING_BAG
    } as const;

    const cacheResult = await getCachedQuads(input);
    if (isError(cacheResult)) {
      return cacheResult;
    }
    if (cacheResult.value === undefined) {
      return error(new Error("no cached value"));
    }

    if (this.cacheHitAlgorithm === 'equality') {
      const bindings = ActorQueryProcessRemoteCache.bindingConvertion(cacheResult.value.cache);
      const it: BindingsStream = new ArrayIterator(bindings, { autoStart: false });
      return result({bindings:it});
    }

    const store = this.bindingToQuadStore(ActorQueryProcessRemoteCache.bindingConvertion(cacheResult.value.cache), query);

    return result({stores: [store, ...rdfStores]});
  }

  private isRdfStore(source: QuerySourceUnidentified): source is RDF.Store {
    return typeof source !== 'string' && ((
      'value' in source &&
      typeof source.value !== 'string' &&
      'match' in source.value) ||
      ('match' in source))
  }

  public static bindingConvertion(bindings: IBindings[]): Bindings[] {
    const resp: Bindings[] = [];
    for (const binding of bindings) {
      const current = BF.fromRecord(binding);
      resp.push(current);
    }
    return resp;
  }

  private bindingToQuadStore(bindings: Bindings[], query: Algebra.Operation): RdfStore {
    const store = RdfStore.createDefault();
    const template = this.queryToTemplate(query);
    const unprojectedVariables = this.getUnprojectedVariables(query);
    for (const [i, binding] of bindings.entries()) {
      const quads = bindTemplateWithProjection(RDF_FACTORY, binding, template, i, unprojectedVariables);
      for (const quad of quads) {
        store.addQuad(quad);
      }
    }

    return store;
  }

  private queryToTemplate(query: Algebra.Operation): RDF.BaseQuad[] {
    const template: RDF.BaseQuad[] = [];
    // do not support MINUS and NOT EXISTS
    Util.recurseOperation(query, {
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        const quad = RDF_FACTORY.quad(
          <RDF.Quad_Subject>op.subject,
          <RDF.Quad_Predicate>op.predicate,
          <RDF.Quad_Object>op.object,
          <RDF.Quad_Graph>op.graph);
        template.push(quad);
        return true
      }
    });

    return template;
  }

  private getUnprojectedVariables(query: Algebra.Operation): Set<string> {
    const projectedVariables: Set<string> = new Set();
    const usedVariables: Set<string> = new Set();
    const unprojectedVariables: Set<string> = new Set();

    /// does not support property paths
    Util.recurseOperation(query, {
      [Algebra.types.PROJECT]: (op: Algebra.Project) => {
        for (const variable of op.variables) {
          projectedVariables.add(variable.value);
        }
        return true;
      },
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        if (op.subject.termType === "Variable") {
          usedVariables.add(op.subject.value);
        }
        if (op.predicate.termType === "Variable") {
          usedVariables.add(op.predicate.value);
        }
        if (op.object.termType === "Variable") {
          usedVariables.add(op.object.value);
        }
        return false;
      }
    });

    for (const v of usedVariables) {
      if (!projectedVariables.has(v)) {
        unprojectedVariables.add(v)
      }
    }

    return unprojectedVariables;
  }
}

export type CachingResult = {
  bindings: BindingsStream
} | {
  stores: RDF.Store[]
};

export interface IActorQueryProcessRemoteCacheArgs extends IActorQueryProcessArgs {
  fallBackQueryProcess: ActorQueryProcess;
  cacheHitAlgorithm: Algorithm;
}

type Algorithm = 'equality' | 'containment';