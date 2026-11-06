import type { IActionWarmup, IActorWarmupArgs, IActorWarmupOutput } from '@comunica/bus-warmup';
import { ActorWarmup } from '@comunica/bus-warmup';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica warmup actor that executes queries derived from the data in the sources,
 * such as single patterns, stars, and paths, all with a limit.
 */
export class ActorWarmupDataDerived extends ActorWarmup {
  public static readonly MAX_PREDICATES = 24;
  public static readonly MAX_SUBJECTS = 24;
  public static readonly LIMIT = 20;
  public static readonly MEDIA_TYPE = 'application/sparql-results+json';

  public constructor(args: IActorWarmupArgs) {
    super(args);
  }

  public async test(action: IActionWarmup): Promise<TestResult<IActorTest>> {
    const sources = action.context.get(KeysInitQuery.querySourcesUnidentified) ?? [];
    if (sources.length === 0) {
      return failTest(`${this.name} requires sources to warm up over`);
    }
    return passTestVoid();
  }

  public async run(action: IActionWarmup): Promise<IActorWarmupOutput> {
    const executions = action.executions ?? Number.POSITIVE_INFINITY;
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
