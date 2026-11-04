import type { IActionWarmup, IActorWarmupArgs, IActorWarmupOutput } from '@comunica/bus-warmup';
import { ActorWarmup } from '@comunica/bus-warmup';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { ActionContextKey, failTest, passTestVoid } from '@comunica/core';
import type { IActionContext, QuerySourceUnidentified } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * The types of sources that are in memory or in files.
 */
const LOCAL_SOURCE_TYPES = new Set([ 'rdfjs', 'file', 'serialized', 'compositefile' ]);

/**
 * The shortcut with which query contexts usually contain their sources.
 */
const SOURCES_SHORTCUT = new ActionContextKey<QuerySourceUnidentified[]>('sources');

/**
 * A comunica warmup actor that executes queries derived from the data in the sources,
 * such as single patterns, stars, and paths, all with a limit.
 */
export class ActorWarmupDataDerived extends ActorWarmup {
  public static readonly MAX_PREDICATES = 24;
  public static readonly MAX_SUBJECTS = 24;
  public static readonly LIMIT = 20;
  public static readonly MEDIA_TYPE = 'application/sparql-results+json';

  public readonly executions: number;

  public constructor(args: IActorWarmupDataDerivedArgs) {
    super(args);
    this.executions = args.executions;
  }

  public async test(action: IActionWarmup): Promise<TestResult<IActorTest>> {
    const sources = action.context.get(KeysInitQuery.querySourcesUnidentified) ??
      action.context.get(SOURCES_SHORTCUT) ?? [];
    if (sources.length === 0) {
      return failTest(`${this.name} requires sources to warm up over`);
    }
    // Over remote sources, every query would wait on the network, and burden their servers
    for (const source of sources) {
      const description = ActorWarmupDataDerived.describeNonLocalSource(source);
      if (description) {
        return failTest(`${this.name} only warms up over sources in memory or in files, so not over ${description}`);
      }
    }
    return passTestVoid();
  }

  /**
   * Describe a source unless it is in memory or in a file, which is loaded once, so that queries over it do not
   * access the network. Sources given only as a URL are not, as they may also be SPARQL endpoints or other interfaces.
   * @param source A source.
   * @return A description of the source, or undefined if it is in memory or in a file.
   */
  public static describeNonLocalSource(source: QuerySourceUnidentified): string | undefined {
    if (typeof source === 'string') {
      // Paths and file URLs, and Windows paths, whose drive letter looks like a one-letter URL scheme
      return source.startsWith('file:') || !/^[a-z][\d+.a-z-]+:/iu.test(source) ? undefined : source;
    }
    if ('match' in source) {
      return undefined;
    }
    if (source.type !== undefined) {
      return LOCAL_SOURCE_TYPES.has(source.type) ? undefined : `a source of type ${source.type}`;
    }
    return typeof source.value === 'string' ? ActorWarmupDataDerived.describeNonLocalSource(source.value) : undefined;
  }

  public async run(action: IActionWarmup): Promise<IActorWarmupOutput> {
    const executions = action.executions ?? this.executions;
    const budget = action.budget ?? Number.POSITIVE_INFINITY;
    // The budget starts once the first query has loaded the sources, so loading them does not count towards it
    let start = Number.POSITIVE_INFINITY;
    const stopped = (): boolean => Boolean(action.signal?.aborted) || Date.now() - start >= budget;
    const queries = await ActorWarmupDataDerived.generateQueries(action.engine, action.context, stopped, () => {
      start = Date.now();
    });
    let executed = 0;
    while (queries.length > 0 && executed < executions && !stopped()) {
      const result = await action.engine.query(queries[executed % queries.length], action.context);
      const { data } = await action.engine.resultToString(result, ActorWarmupDataDerived.MEDIA_TYPE);
      await ActorWarmupDataDerived.consume(data);
      executed++;
    }
    return { executions: executed };
  }

  /**
   * Generate warm-up queries from the data in the sources.
   * @param engine A query engine.
   * @param context A context with the sources.
   * @param stopped A check after which no more data is sampled.
   * @param loaded A callback for when the first query, which loads the sources, has completed.
   */
  public static async generateQueries(
    engine: IActionWarmup['engine'],
    context: IActionContext,
    stopped: () => boolean = () => false,
    loaded: () => void = () => {},
  ): Promise<string[]> {
    const select = async(query: string): Promise<RDF.Bindings[]> =>
      stopped() ? [] : (await engine.queryBindings(query, context)).toArray();
    const queries: string[] = [];
    const subjects: RDF.NamedNode[] = [];
    const predicates = (await select('SELECT DISTINCT ?p WHERE { ?s ?p ?o } LIMIT 64'))
      .map(bindings => bindings.get('p')!)
      .filter(term => term.termType === 'NamedNode')
      .slice(0, ActorWarmupDataDerived.MAX_PREDICATES);
    loaded();
    const limit = ActorWarmupDataDerived.LIMIT;

    // Single patterns, with a bound object if it is an IRI
    for (const predicate of predicates) {
      for (const bindings of await select(`SELECT ?s ?o WHERE { ?s <${predicate.value}> ?o } LIMIT 2`)) {
        const subject = bindings.get('s')!;
        const object = bindings.get('o')!;
        if (subject.termType === 'NamedNode') {
          subjects.push(subject);
        }
        queries.push(`SELECT ?s WHERE { ?s <${predicate.value}> ${object.termType === 'NamedNode' ? `<${object.value}>` : '?o'} } LIMIT ${limit}`);
      }
    }

    // Stars and paths around sampled subjects
    for (const subject of subjects.slice(0, ActorWarmupDataDerived.MAX_SUBJECTS)) {
      const properties = await select(`SELECT ?p ?o WHERE { <${subject.value}> ?p ?o } LIMIT 16`);
      const subjectPredicates = [ ...new Set(properties.map(bindings => bindings.get('p')!.value)) ];
      if (subjectPredicates.length >= 2) {
        const [ first, second ] = subjectPredicates;
        queries.push(`SELECT * WHERE { ?s <${first}> ?a . ?s <${second}> ?b } LIMIT ${limit}`);
        queries.push(`SELECT ?s ?b WHERE { ?s <${first}> ?a . ?s <${second}> ?b . ?s ?p ?c } LIMIT ${limit}`);
      }
      const link = properties.find(bindings => bindings.get('o')!.termType === 'NamedNode');
      if (link) {
        const linkPredicate = link.get('p')!.value;
        const next = await select(`SELECT ?p WHERE { <${link.get('o')!.value}> ?p ?x } LIMIT 1`);
        if (next.length > 0) {
          const nextPredicate = next[0].get('p')!.value;
          queries.push(`SELECT * WHERE { ?a <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c } LIMIT ${limit}`);
          queries.push(`SELECT ?b ?c WHERE { <${subject.value}> <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c . ?c ?q ?d } LIMIT ${limit}`);
          queries.push(`SELECT ?a ?c WHERE { ?a <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c . ?a <${subjectPredicates[0]}> ?e } LIMIT ${limit}`);
        }
      }
    }
    return queries;
  }

  protected static consume(data: NodeJS.ReadableStream): Promise<void> {
    return new Promise((resolve, reject) => {
      data.on('data', () => {
        // Discard the output
      });
      data.on('error', reject);
      data.on('end', resolve);
    });
  }
}

export interface IActorWarmupDataDerivedArgs extends IActorWarmupArgs {
  /**
   * The number of query executions if the action does not determine it.
   * @range {integer}
   * @default {2000}
   */
  executions: number;
}
