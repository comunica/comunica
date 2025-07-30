import { ActorQueryProcess, IActionQueryProcess, IActorQueryProcessOutput, IActorQueryProcessArgs } from '@comunica/bus-query-process';
import { TestResult, IActorTest, passTestVoid } from '@comunica/core';
import { KeyRemoteCache, KeysInitQuery } from '@comunica/context-entries';
import { Algebra, toSparql, translate, Util } from 'sparqlalgebrajs';
import {
  CacheHitFunction,
  getCachedQuads,
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
      if (Array.isArray(resultOrError.value)) {
        action.context.set(KeysInitQuery.querySourcesUnidentified, resultOrError.value);
      } else {
        return {
          result: {
            type: 'bindings',
            bindingsStream: resultOrError.value,
            metadata: () => {
              return new Promise((resolve) => { resolve(<any>"cached bindings") })
            }
          }
        }
      }
    }
    return this.fallBackQueryProcess.run(action, undefined);
  }

  public static async equalityCacheHit(q1: Readonly<Algebra.Operation>,
    q2: Readonly<Algebra.Operation>,
    _options?: IOptions): SafePromise<boolean> {
    return result(toSparql(q1) === toSparql(q2))
  }

  public async queryCachedResults(action: IActionQueryProcess): SafePromise<RDF.Store[] | BindingsStream> {
    const cacheUrl: string | undefined = action.context.get(KeyRemoteCache.url);
    if (cacheUrl === undefined) {
      return error(new Error("cache URL does not exist"));
    }
    let simpleCacheHit: CacheHitFunction | undefined;
    switch (this.cacheHitAlgorithm) {
      case 'equality':
        simpleCacheHit = ActorQueryProcessRemoteCache.equalityCacheHit;
        break;
      default:
        break;
    }

    const query: Algebra.Operation = typeof action.query === 'string' ? translate(action.query) : action.query;

    const sources: QuerySourceUnidentified[] = action.context.get(KeysInitQuery.querySourcesUnidentified) ?? [];
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

    const input = {
      cache: cacheUrl,
      query,
      // Only includes non-SERVICE endpoint(s)
      endpoints,
      cacheHitAlgorithms: [
        {
          algorithm: simpleCacheHit!,
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
      const bindings = this.bindingConvertion(cacheResult.value.cache);
      const it: BindingsStream = new ArrayIterator(bindings, { autoStart: false });
      return result(it);
    }

    const store = this.bindingToQuadStore(this.bindingConvertion(cacheResult.value.cache), query);

    return result([store, ...rdfStores]);
  }

  private isRdfStore(source: QuerySourceUnidentified): source is RDF.Store {
    return typeof source !== 'string' && ((
      'value' in source &&
      typeof source.value !== 'string' &&
      'match' in source.value) ||
      ('match' in source))
  }

  private bindingConvertion(bindings: IBindings[]): Bindings[] {
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


export interface IActorQueryProcessRemoteCacheArgs extends IActorQueryProcessArgs {
  fallBackQueryProcess: ActorQueryProcess;
  cacheHitAlgorithm: Algorithm;
}

type Algorithm = 'equality' | 'containment';