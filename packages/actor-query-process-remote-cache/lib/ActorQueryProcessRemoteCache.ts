import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
} from "@comunica/bus-query-process";
import { ActorQueryProcess } from "@comunica/bus-query-process";
import { KeysHttp, KeysInitQuery } from "@comunica/context-entries";
import { passTestVoid, ActionContextKey } from "@comunica/core";
import type { TestResult, IActorTest } from "@comunica/core";
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
  QuerySourceUnidentified,
} from "@comunica/types";
import { BindingsFactory } from "@comunica/utils-bindings-factory";
import type * as RDF from "@rdfjs/types";
import { ArrayIterator } from "asynciterator";
import { DataFactory } from "rdf-data-factory";
import { RdfStore } from "rdf-stores";
import { isError, error, result, isResult } from "result-interface";
import type { SafePromise } from "result-interface";
import type { CacheHitFunction, IOptions } from "sparql-cache-client";
import {
  getCachedQuads,
  type CacheLocation,
  OutputOption,
} from "sparql-cache-client";
import type { ISolverOption } from "sparql-federated-query-containment";
import { isContained, SEMANTIC } from "sparql-federated-query-containment";
import { Algebra, toSparql, Factory, translate, Util } from "sparqlalgebrajs";
import { IBindings } from "sparqljson-parse";
import * as Z3_SOLVER from "z3-solver";
import { bindTemplateWithProjection } from "./bindTemplateWithProjection";
import {
  updateQueriesTTL,
  uploadQueryFile,
  uploadResults,
  ensureCacheContainer,
  bindingsStreamToSparqlJson,
} from "./WriteResultsToCache";

export const KeyRemoteCache = {
  /**
   * The url of a remote cache of results
   */
  location: new ActionContextKey<CacheLocation>(
    "@comunica/remote-cache:location"
  ),
  valueClauseBlockSize: new ActionContextKey<number>(
    "@comunica/remote-cache:valueClauseBlockSize"
  ),
  valueClauseReduction: new ActionContextKey<boolean>(
    "@comunica/remote-cache:valueClauseReduction"
  ),
};
const RDF_FACTORY: ComunicaDataFactory = new DataFactory();
const BF = new BindingsFactory(RDF_FACTORY);
const AF = new Factory(<any>RDF_FACTORY);

/**
 * A comunica Remote Cache Query Process Actor.
 */
export class ActorQueryProcessRemoteCache extends ActorQueryProcess {
  private readonly fallBackQueryProcess: ActorQueryProcess;
  public readonly cacheHitAlgorithm: Algorithm;

  public static readonly ERROR_FAIL_ON_CACHE_MISS: string =
    "the engine was configured to fail if a cache entry is missing, but no cached result was found for this query";
  public static readonly ERROR_ONLY_SELECT_QUERIES_SUPPORTED =
    "the engine in this configuration only support SELECT queries";
  public static readonly KEY_FAIL_ON_CACHE_MISS = new ActionContextKey(
    "failOnCacheMiss"
  );
  public static readonly STREAM_PROVENANCE_PROPERTY = "provenance";

  public constructor(args: IActorQueryProcessRemoteCacheArgs) {
    super(args);
  }

  public async test(
    _action: IActionQueryProcess
  ): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(
    action: IActionQueryProcess
  ): Promise<IActorQueryProcessOutput> {
    const resultOrError = await this.queryCachedResults(action);
    const start = performance.now();
    let provenance: Provenance = "query processing";
    let id: RDF.Term | undefined;
    let complementaryQueries: IComplementaryQuery[] | undefined;

    if (isResult(resultOrError)) {
      this.logInfo(
        action.context,
        `using the remote cache from: ${JSON.stringify(
          action.context.getSafe(KeyRemoteCache.location),
          null,
          2
        )}`
      );

      if ("stores" in resultOrError.value) {
        provenance = Algorithm.CONTAINMENT;
        id = resultOrError.value.id;
        complementaryQueries = resultOrError.value.complementaryQueries;
        action.context = action.context.set(
          KeysInitQuery.querySourcesUnidentified,
          resultOrError.value.stores
        );
      } else {
        resultOrError.value.bindings.setProperty(
          ActorQueryProcessRemoteCache.STREAM_PROVENANCE_PROPERTY,
          {
            algorithm: Algorithm.EQ,
            id: resultOrError.value.id,
            profiling: resultOrError.value.profiling,
          }
        );
        const end = performance.now();
        resultOrError.value.profiling.finalProcessing = end - start;
        //console.log(JSON.stringify(resultOrError.value.profiling, null, 2));
        return {
          result: {
            type: "bindings",
            bindingsStream: resultOrError.value.bindings,
            metadata: () =>
              new Promise((resolve) => {
                resolve(<any>"cached bindings");
              }),
          },
        };
      }
    } else {
      this.logInfo(
        action.context,
        "query not found in the cache, performing the full execution"
      );
    }

    const failOnCacheMiss = action.context.get(
      ActorQueryProcessRemoteCache.KEY_FAIL_ON_CACHE_MISS
    );

    if (failOnCacheMiss === true && provenance == "query processing") {
      throw new Error(ActorQueryProcessRemoteCache.ERROR_FAIL_ON_CACHE_MISS);
    }

    const res = await this.fallBackQueryProcess.run(action, undefined);
    if (res.result.type !== "bindings") {
      throw new Error(
        ActorQueryProcessRemoteCache.ERROR_ONLY_SELECT_QUERIES_SUPPORTED
      );
    }

    const end = performance.now();
    if (isResult(resultOrError)) {
      resultOrError.value.profiling.finalProcessing = end - start;
      //console.log(JSON.stringify(resultOrError.value.profiling, null, 2));
      res.result.bindingsStream.setProperty(
        ActorQueryProcessRemoteCache.STREAM_PROVENANCE_PROPERTY,
        {
          algorithm: provenance,
          id,
          complementaryQueries,
          profiling: resultOrError.value.profiling,
        }
      );
    } else {
      res.result.bindingsStream.setProperty(
        ActorQueryProcessRemoteCache.STREAM_PROVENANCE_PROPERTY,
        { algorithm: provenance, id, complementaryQueries }
      );
    }

    // <-- Place save-to-querycache logic here -->
    // TODO: Wrap this in a condition if a context flag is set (bool === true)
    // query cache url
    const cacheLocation = action.context.getSafe(KeyRemoteCache.location);
    // query
    const queryString =
      typeof action.query === "string" ? action.query : toSparql(action.query);
    // sources
    const sources: any[] =
      action.context.getSafe(new ActionContextKey("sources")) ?? [];
    const endpoints: string[] = [];
    for (const source of sources) {
      if (typeof source === "string") {
        endpoints.push(source);
      } else if ("value" in source && typeof source.value === "string") {
        endpoints.push(source.value);
      }
    }
    if (await ensureCacheContainer(cacheLocation.toString())) {
      // TODO: Check to make sure all this works ...
      const queryResult = await bindingsStreamToSparqlJson(res.result);
      const hash = await updateQueriesTTL(
        cacheLocation.toString(),
        queryString,
        endpoints
      );
      await uploadQueryFile(cacheLocation.toString(), queryString, hash);
      await uploadResults(
        cacheLocation.toString(),
        JSON.stringify(queryResult, null, 2),
        hash
      );
      console.log(`Saved query result to cache with hash: ${hash}`);
    } else {
      console.log(`Failed to save query result to cache`);
    }
    return res;
  }

  public static async equalityCacheHit(
    q1: Readonly<Algebra.Operation>,
    q2: Readonly<Algebra.Operation>,
    _options?: IOptions
  ): SafePromise<boolean> {
    return result(toSparql(q1) === toSparql(q2));
  }

  public async generateQueryContainmentCacheHitFunction(): Promise<CacheHitFunction> {
    const Z3 = await Z3_SOLVER.init();

    return async (
      q1: Readonly<Algebra.Operation>,
      q2: Readonly<Algebra.Operation>,
      options?: IOptions
    ): SafePromise<boolean> => {
      const option: ISolverOption =
        options === undefined
          ? {
              sources: [],
              semantic: SEMANTIC.BAG_SET,
              z3: Z3,
            }
          : {
              ...options,
              semantic: SEMANTIC.BAG_SET,
              z3: Z3,
            };
      const resp = await isContained(q1, q2, option);
      if (isError(resp)) {
        return error(new Error(resp.error.error));
      }
      return result(resp.value.result);
    };
  }

  private async getCacheHitAlgorithm(): SafePromise<CacheHitFunction[]> {
    switch (this.cacheHitAlgorithm) {
      case "equality":
        return result([ActorQueryProcessRemoteCache.equalityCacheHit]);
      case "containment":
        return result([await this.generateQueryContainmentCacheHitFunction()]);
      case "all":
        return result([
          ActorQueryProcessRemoteCache.equalityCacheHit,
          await this.generateQueryContainmentCacheHitFunction(),
        ]);
      default:
        return error(
          new Error(`algorithm ${this.cacheHitAlgorithm} not supported`)
        );
    }
  }

  public async queryCachedResults(
    action: IActionQueryProcess
  ): SafePromise<CachingResult> {
    const profiling: Partial<IProfiling> = {};
    const cacheLocation: CacheLocation | undefined = action.context.get(
      KeyRemoteCache.location
    );
    if (cacheLocation === undefined) {
      return error(new Error("cache URL does not exist"));
    }

    const query: Algebra.Operation =
      typeof action.query === "string" ? translate(action.query) : action.query;

    const sources: any[] =
      action.context.get(new ActionContextKey("sources")) ?? [];
    const endpoints: string[] = [];
    const rdfStores: RDF.Store[] = [];

    for (const source of sources) {
      if (typeof source === "string") {
        endpoints.push(source);
      } else if ("value" in source && typeof source.value === "string") {
        endpoints.push(source.value);
      } else if (this.isRdfStore(source)) {
        rdfStores.push(source);
      }
    }
    const cacheHitAlgorithmOrError = await this.getCacheHitAlgorithm();

    if (isError(cacheHitAlgorithmOrError)) {
      return cacheHitAlgorithmOrError;
    }

    const input = {
      cache: cacheLocation,
      query,
      // Only includes non-SERVICE endpoint(s)
      endpoints,
      cacheHitAlgorithms: cacheHitAlgorithmOrError.value,
      outputOption: OutputOption.BINDING_BAG,
      customFetchFunction: <any>action.context.get(<any>"fetch"),
    } as const;

    const startCacheChecking = performance.now();
    const cacheResult = await getCachedQuads(input);
    const endCacheChecking = performance.now();
    profiling.cacheChecking = endCacheChecking - startCacheChecking;

    if (isError(cacheResult)) {
      return cacheResult;
    }
    if (cacheResult.value === undefined) {
      return error(new Error("no cached value"));
    }
    const {
      value: { cache: cachedValues, query: cachedQuery, algorithmIndex, id },
    } = cacheResult;

    // When the all algorithm is selected the index for the equality algorithm is 0
    if (
      this.cacheHitAlgorithm === Algorithm.EQ ||
      (this.cacheHitAlgorithm === Algorithm.ALL && algorithmIndex === 0)
    ) {
      const start = performance.now();
      const bindings =
        ActorQueryProcessRemoteCache.bindingConvertion(cachedValues);
      const it: BindingsStream = new ArrayIterator(bindings, {
        autoStart: false,
      });
      const end = performance.now();
      profiling.cacheProcessing = end - start;

      return result({ bindings: it, id, profiling });
    }

    const startInitialInjection = performance.now();
    const store = this.bindingToQuadStore(
      ActorQueryProcessRemoteCache.bindingConvertion(cachedValues),
      query
    );
    const endInitialInjection = performance.now();
    profiling.initialInjestion = endInitialInjection - startInitialInjection;

    const blockSize: number =
      action.context.get(KeyRemoteCache.valueClauseBlockSize) ??
      Number.MAX_SAFE_INTEGER;
    const valueClauseReduction =
      action.context.get(KeyRemoteCache.valueClauseReduction) === true
        ? {
            action,
            store,
          }
        : undefined;

    const startCacheProcessing = performance.now();
    const complementaryQueries = await this.createComplementaryQuery(
      cachedQuery,
      query,
      cachedValues,
      blockSize,
      valueClauseReduction
    );
    if (complementaryQueries === undefined) {
      return result({ stores: [store, ...rdfStores], id, profiling });
    }
    const tripleStoreInsertion = [];
    for (const { query, endpoint: internalSources } of complementaryQueries) {
      for (const q of Array.isArray(query) ? query : [query]) {
        const newAction = {
          ...action,
          query: q,
          context: action.context
            .set(
              new ActionContextKey("sources"),
              internalSources === undefined ? sources : [internalSources]
            )
            .set(KeysHttp.fetch, action.context.get(<any>"fetch")),
        };
        const { result: complementaryResult } =
          await this.fallBackQueryProcess.run(newAction, undefined);
        const { quadStream } = <IQueryOperationResultQuads>complementaryResult;
        const insertionOp = new Promise<void>((resolve, reject) => {
          quadStream.on("data", (quad) => {
            store.addQuad(quad);
          });
          quadStream.on("end", () => {
            resolve();
          });
          quadStream.on("error", (err) => {
            reject(err);
          });
        });

        tripleStoreInsertion.push(insertionOp);
      }
    }
    await Promise.all(tripleStoreInsertion);
    const endCacheProcessing = performance.now();
    profiling.cacheProcessing = endCacheProcessing - startCacheProcessing;

    return result({
      stores: [store, ...rdfStores],
      id,
      complementaryQueries,
      profiling,
    });
  }

  public async valuesClauseReduction(
    superQuery: Algebra.Operation,
    subQueryValues: Algebra.Values[],
    variables: RDF.Variable[],
    action: IActionQueryProcess,
    store: RDF.Store
  ): Promise<Algebra.Values | undefined> {
    if (subQueryValues.length === 0) {
      return undefined;
    }
    const tps: RDF.Quad[] = [];

    Util.recurseOperation(superQuery, {
      [Algebra.types.SERVICE]: () => false,
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        const tp = RDF_FACTORY.quad(
          <any>op.subject,
          <any>op.predicate,
          <any>op.object,
          <any>op.graph
        );
        tps.push(tp);
        return true;
      },
    });

    const patterns = tps.map((tp) =>
      AF.createPattern(tp.subject, tp.predicate, tp.object)
    );
    const bgp = AF.createBgp(patterns);
    const jointedOperation: Algebra.Operation[] = [bgp];
    for (const value of subQueryValues) {
      jointedOperation.push(value);
    }
    const join = AF.createJoin(jointedOperation);
    const selectQuery = AF.createProject(join, variables);
    //console.log(toSparql(selectQuery));
    const newAction = {
      ...action,
      query: selectQuery,
      context: action.context.set(new ActionContextKey("sources"), [store]),
    };
    const res = await this.fallBackQueryProcess.run(newAction, undefined);
    const bindings = (<IQueryOperationResultBindings>res.result).bindingsStream;

    const newBindings: {
      [key: string]: RDF.Literal | RDF.NamedNode;
    }[] = [];

    await new Promise<void>((resolve, reject) => {
      bindings.on("data", (data: RDF.Bindings) => {
        const currentBinding: {
          [key: string]: RDF.Literal | RDF.NamedNode;
        } = {};

        for (const [variable, value] of data) {
          currentBinding["?" + variable.value] = <RDF.Literal | RDF.NamedNode>(
            value
          );
        }
        newBindings.push(currentBinding);
      });

      bindings.on("end", () => resolve());

      bindings.on("error", (err) => reject(err));
    });

    if (Object.keys(newBindings).length === 0) {
      return undefined;
    }
    const resultingValues = AF.createValues(variables, newBindings);
    return resultingValues;
  }

  private isRdfStore(source: QuerySourceUnidentified): source is RDF.Store {
    return (
      typeof source !== "string" &&
      (("value" in source &&
        typeof source.value !== "string" &&
        "match" in source.value) ||
        "match" in source)
    );
  }

  public static bindingConvertion(bindings: IBindings[]): Bindings[] {
    const resp: Bindings[] = [];
    for (const binding of bindings) {
      const current = BF.fromRecord(binding);
      resp.push(current);
    }
    return resp;
  }

  private bindingToQuadStore(
    bindings: Bindings[],
    query: Algebra.Operation
  ): RdfStore {
    const store = RdfStore.createDefault();
    const template = this.queryToTemplate(query);
    const unprojectedVariables = this.getUnprojectedVariables(query);
    //const values = ActorQueryProcessRemoteCache.extractValueClauses(query, true);
    //const validBinding:Bindings[] = [];
    for (const [i, binding] of bindings.entries()) {
      const quads = bindTemplateWithProjection(
        RDF_FACTORY,
        binding,
        template,
        i,
        unprojectedVariables
      );
      for (const quad of quads) {
        store.addQuad(quad);
      }
    }

    return store;
  }

  private queryToTemplate(query: Algebra.Operation): RDF.BaseQuad[] {
    const template: RDF.BaseQuad[] = [];
    // Do not support MINUS and NOT EXISTS
    Util.recurseOperation(query, {
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        const quad = RDF_FACTORY.quad(
          <RDF.Quad_Subject>op.subject,
          <RDF.Quad_Predicate>op.predicate,
          <RDF.Quad_Object>op.object,
          <RDF.Quad_Graph>op.graph
        );
        template.push(quad);
        return true;
      },
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
      },
    });

    for (const v of usedVariables) {
      if (!projectedVariables.has(v)) {
        unprojectedVariables.add(v);
      }
    }

    return unprojectedVariables;
  }

  /**
   * For a subquery to be contained in a superquery,
   * we need to create a containment mapping that maps the variables of the superquery to those of the subquery so that every goal of the superquery is mapped to a goal of the subquery.
   * In terms of constraints, this means the superquery’s constraints are a subset of the subquery’s constraints with exactly the same variables. So, we can “color” the subquery to find which parts are not part of the intersection of constraints.
   * @param superQuery
   * @param subQuery
   */
  public async createComplementaryQuery(
    superQuery: Algebra.Operation,
    subQuery: Algebra.Operation,
    bindings: IBindings[] = [],
    blockSize: number,
    valueClauseReduction?: {
      action: IActionQueryProcess;
      store: RDF.Store;
    }
  ): Promise<IComplementaryQuery[] | undefined> {
    const resp: IComplementaryQuery[] = [];
    await this.createComplementaryQueryRecurs(
      superQuery,
      subQuery,
      resp,
      undefined,
      bindings,
      blockSize,
      valueClauseReduction
    );
    return resp.length === 0 ? undefined : resp;
  }

  private async createComplementaryQueryRecurs(
    superQuery: Algebra.Operation,
    subQuery: Algebra.Operation,
    acc: IComplementaryQuery[],
    endpoint: string | undefined,
    bindings: IBindings[],
    blockSize: number,
    valueClauseReduction?: {
      action: IActionQueryProcess;
      store: RDF.Store;
    }
  ): Promise<void> {
    const tps: RDF.Quad[] = [];
    const operations: Promise<void>[] = [];
    Util.recurseOperation(superQuery, {
      [Algebra.types.SERVICE]: (op: Algebra.Service) => {
        let subService: Algebra.Operation | undefined;
        Util.recurseOperation(subQuery, {
          [Algebra.types.SERVICE]: (subOp: Algebra.Service) => {
            if (op.name.equals(subOp.name)) {
              subService = subOp.input;
            }
            return false;
          },
        });
        if (subService === undefined) {
          return false;
        }
        operations.push(
          this.createComplementaryQueryRecurs(
            op.input,
            subService,
            acc,
            op.name.value,
            bindings,
            blockSize,
            valueClauseReduction
          )
        );

        return false;
      },
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        const tp = RDF_FACTORY.quad(
          <any>op.subject,
          <any>op.predicate,
          <any>op.object,
          <any>op.graph
        );
        tps.push(tp);
        return true;
      },
    });

    await Promise.all(operations);

    const uncoloredTps = ActorQueryProcessRemoteCache.colorQuery(subQuery, tps);
    if (uncoloredTps.length === 0) {
      return undefined;
    }
    const queryValuesClauses =
      ActorQueryProcessRemoteCache.extractValueClauses(subQuery);

    const patterns = uncoloredTps.map((tp) =>
      AF.createPattern(tp.subject, tp.predicate, tp.object)
    );
    const bgp = AF.createBgp(patterns);
    let constructs: Algebra.Construct[] = [];
    let values: Algebra.Values[] | [undefined] = [undefined];
    const batchedValues: Algebra.Values[] | [undefined] =
      ActorQueryProcessRemoteCache.createValueClauseFromBindings(
        patterns,
        bindings,
        blockSize
      ) ?? [undefined];

    if (
      valueClauseReduction !== undefined &&
      batchedValues.length !== 0 &&
      batchedValues[0] !== undefined
    ) {
      // we assume that all the values have the same bindings key
      const reducedValues = await this.valuesClauseReduction(
        superQuery,
        queryValuesClauses,
        batchedValues[0].variables,
        valueClauseReduction.action,
        valueClauseReduction.store
      );
      //console.log(JSON.stringify(reducedValues, null, 2));
      values = reducedValues !== undefined ? [reducedValues] : [undefined];
    } else {
      values = batchedValues;
    }

    for (const value of values) {
      let construct: Algebra.Construct;

      if (value === undefined && queryValuesClauses.length === 0) {
        construct = AF.createConstruct(bgp, patterns);
      } else {
        const jointedOperations = value !== undefined ? [value, bgp] : [bgp];
        for (const queryValuesClause of queryValuesClauses) {
          jointedOperations.push(queryValuesClause);
        }
        const join = AF.createJoin(jointedOperations);
        construct = AF.createConstruct(join, patterns);
      }
      constructs.push(construct);
    }

    acc.push({ query: constructs, endpoint, superQuery });
  }
  private variablesFromTps(tps: RDF.Quad[]): RDF.Variable[] {
    const resp: RDF.Variable[] = [];
    for (const tp of tps) {
      if (tp.subject.termType === "Variable") {
        resp.push(tp.subject);
      }

      if (tp.predicate.termType === "Variable") {
        resp.push(tp.predicate);
      }

      if (tp.object.termType === "Variable") {
        resp.push(tp.object);
      }
    }
    return resp;
  }
  private static extractValueClauses(
    query: Algebra.Operation,
    allValues?: boolean
  ): Algebra.Values[] {
    const resp: Algebra.Values[] = [];
    Util.recurseOperation(query, {
      [Algebra.types.VALUES]: (op: Algebra.Values) => {
        resp.push(op);
        return true;
      },
      [Algebra.types.SERVICE]: () => {
        return allValues ?? false;
      },
    });

    return resp;
  }

  private static createValueClauseFromBindings(
    patterns: Algebra.Pattern[],
    bindings: IBindings[],
    blockSize: number
  ): Algebra.Values[] | undefined {
    const variables: Set<string> = new Set();
    const validBindings: Record<string, RDF.Literal | RDF.NamedNode>[] = [];
    const bindingVariables: Set<string> = new Set();

    for (const pattern of patterns) {
      if (pattern.subject.termType === "Variable") {
        variables.add(pattern.subject.value);
      }

      if (pattern.predicate.termType === "Variable") {
        variables.add(pattern.predicate.value);
      }

      if (pattern.object.termType === "Variable") {
        variables.add(pattern.object.value);
      }
    }
    for (const binding of bindings) {
      const currentBinding: IBindings = {};
      for (const [variable, value] of Object.entries(binding)) {
        if (variables.has(variable)) {
          bindingVariables.add(variable);
          currentBinding[`?${variable}`] = value;
        }
      }
      if (Object.keys(currentBinding).length > 0) {
        validBindings.push(<any>currentBinding);
      }
    }
    if (bindingVariables.size === 0) {
      return undefined;
    }

    const rdfVariables = [...bindingVariables].map((el) =>
      RDF_FACTORY.variable(el)
    );

    const values: Algebra.Values[] = [];
    let currentBindings = [];
    for (const [i, validBinding] of validBindings.entries()) {
      currentBindings.push(validBinding);
      if ((i + 1) % blockSize === 0) {
        const currentValue = AF.createValues(rdfVariables, currentBindings);
        values.push(currentValue);
        currentBindings = [];
      } else if (i === validBindings.length - 1) {
        const currentValue = AF.createValues(rdfVariables, currentBindings);
        values.push(currentValue);
        currentBindings = [];
      }
    }
    return values;
  }

  public static colorQuery(
    subQuery: Algebra.Operation,
    superQueryTps: RDF.Quad[]
  ): RDF.Quad[] {
    const tps: Map<string, RDF.Quad> = new Map();

    Util.recurseOperation(subQuery, {
      [Algebra.types.SERVICE]: () => false,
      [Algebra.types.PATTERN]: (op: Algebra.Pattern) => {
        const tp = RDF_FACTORY.quad(
          <any>op.subject,
          <any>op.predicate,
          <any>op.object,
          <any>op.graph
        );
        const index = `<${tp.subject.value}> <${tp.predicate.value}> <${tp.object.value}> <${tp.graph.value}>`;
        tps.set(index, tp);
        return true;
      },
    });

    for (const superTp of superQueryTps) {
      for (const [key, tp] of tps) {
        if (this.compatibleTriplePatterns(superTp, tp)) {
          tps.delete(key);
        }
      }
    }

    return [...tps.values()];
  }

  /**
   * Check if every term of a pair of triple patterns are compatible.
   * @param superTp
   * @param subTp
   * @returns
   */
  public static compatibleTriplePatterns(
    superTp: RDF.Quad,
    subTp: RDF.Quad
  ): boolean {
    return (
      this.compatibleTerms(superTp.subject, subTp.subject) &&
      this.compatibleTerms(superTp.predicate, subTp.predicate) &&
      this.compatibleTerms(superTp.object, subTp.object)
    );
  }

  /**
   * Check if two terms are compatible, a compatible terms are either equals to each other
   * Or one term is a variable and the other is a namedNode.
   * @param superTerm
   * @param subTerm
   * @returns
   */
  public static compatibleTerms(
    superTerm: RDF.Term,
    subTerm: RDF.Term
  ): boolean {
    if (superTerm.equals(subTerm)) {
      return true;
    }
    return (
      superTerm.termType === "Variable" && subTerm.termType === "NamedNode"
    );
  }

  private static variablesFromConstruct(
    query: Algebra.Construct
  ): RDF.Variable[] {
    const resp: RDF.Variable[] = [];

    for (const tp of query.template) {
      if (tp.subject.termType === "Variable") {
        resp.push(tp.subject);
      }
      if (tp.predicate.termType === "Variable") {
        resp.push(tp.predicate);
      }
      if (tp.object.termType === "Variable") {
        resp.push(tp.object);
      }
    }
    return resp;
  }
}

export type CachingResult =
  | {
      bindings: BindingsStream;
      id: RDF.Term;
      profiling: Partial<IProfiling>;
    }
  | {
      stores: RDF.Store[];
      complementaryQueries?: IComplementaryQuery[];
      id: RDF.Term;
      profiling: Partial<IProfiling>;
    };

export interface IActorQueryProcessRemoteCacheArgs
  extends IActorQueryProcessArgs {
  fallBackQueryProcess: ActorQueryProcess;
  cacheHitAlgorithm: Algorithm;
}

export interface IComplementaryQuery {
  query: Algebra.Construct | Algebra.Construct[];
  superQuery: Algebra.Operation;
  endpoint?: string;
}

export enum Algorithm {
  EQ = "equality",
  CONTAINMENT = "containment",
  ALL = "all",
}

export const QUERY_PROCESSING_LABEL = "query processing";
type Provenance = Algorithm | typeof QUERY_PROCESSING_LABEL;

export interface IProfiling {
  initialInjestion: number;
  cacheChecking: number;
  cacheProcessing: number;
  finalProcessing: number;
}
