import type { QueryStringContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { QueryEngineBase } from './QueryEngineBase';

/**
 * Warms up a query engine with generic queries over its sources,
 * so that the just-in-time compiler has optimized the engine before it handles actual queries.
 *
 * The queries are derived from the data, and not from any particular workload:
 * single patterns, stars, and paths, all with a limit.
 */
export class EndpointWarmup {
  public static readonly MAX_PREDICATES = 24;
  public static readonly MAX_SUBJECTS = 24;
  public static readonly LIMIT = 20;
  public static readonly MEDIA_TYPE = 'application/sparql-results+json';

  public constructor(
    private readonly engine: QueryEngineBase,
    private readonly context: QueryStringContext,
  ) {}

  /**
   * Generate warm-up queries from the data in the sources.
   */
  public async generateQueries(): Promise<string[]> {
    const queries: string[] = [];
    const subjects: RDF.NamedNode[] = [];
    const predicates = (await this.select('SELECT DISTINCT ?p WHERE { ?s ?p ?o } LIMIT 64'))
      .map(bindings => bindings.get('p')!)
      .filter(term => term.termType === 'NamedNode')
      .slice(0, EndpointWarmup.MAX_PREDICATES);

    // Single patterns, with a bound object if it is an IRI
    for (const predicate of predicates) {
      for (const bindings of await this.select(`SELECT ?s ?o WHERE { ?s <${predicate.value}> ?o } LIMIT 2`)) {
        const subject = bindings.get('s')!;
        const object = bindings.get('o')!;
        if (subject.termType === 'NamedNode') {
          subjects.push(subject);
        }
        queries.push(`SELECT ?s WHERE { ?s <${predicate.value}> ${object.termType === 'NamedNode' ? `<${object.value}>` : '?o'} } LIMIT ${EndpointWarmup.LIMIT}`);
      }
    }

    // Stars and paths around sampled subjects
    for (const subject of subjects.slice(0, EndpointWarmup.MAX_SUBJECTS)) {
      const properties = await this.select(`SELECT ?p ?o WHERE { <${subject.value}> ?p ?o } LIMIT 16`);
      const subjectPredicates = [ ...new Set(properties.map(bindings => bindings.get('p')!.value)) ];
      if (subjectPredicates.length >= 2) {
        const [ first, second ] = subjectPredicates;
        queries.push(`SELECT * WHERE { ?s <${first}> ?a . ?s <${second}> ?b } LIMIT ${EndpointWarmup.LIMIT}`);
        queries.push(`SELECT ?s ?b WHERE { ?s <${first}> ?a . ?s <${second}> ?b . ?s ?p ?c } LIMIT ${EndpointWarmup.LIMIT}`);
      }
      const link = properties.find(bindings => bindings.get('o')!.termType === 'NamedNode');
      if (link) {
        const linkPredicate = link.get('p')!.value;
        const next = await this.select(`SELECT ?p WHERE { <${link.get('o')!.value}> ?p ?x } LIMIT 1`);
        if (next.length > 0) {
          const nextPredicate = next[0].get('p')!.value;
          queries.push(`SELECT * WHERE { ?a <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c } LIMIT ${EndpointWarmup.LIMIT}`);
          queries.push(`SELECT ?b ?c WHERE { <${subject.value}> <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c . ?c ?q ?d } LIMIT ${EndpointWarmup.LIMIT}`);
          queries.push(`SELECT ?a ?c WHERE { ?a <${linkPredicate}> ?b . ?b <${nextPredicate}> ?c . ?a <${subjectPredicates[0]}> ?e } LIMIT ${EndpointWarmup.LIMIT}`);
        }
      }
    }
    return queries;
  }

  /**
   * Generate warm-up queries, and execute them the given number of times in total,
   * serializing their results like the endpoint does, as long as the given time budget allows.
   * The budget starts once the queries are generated, so loading the sources does not count towards it.
   * @param executions The number of query executions.
   * @param budget The maximum duration of the executions in milliseconds, after which no new executions start.
   * @return The number of distinct queries and the number of executions.
   */
  public async run(executions: number, budget: number): Promise<{ queries: number; executions: number }> {
    const queries = await this.generateQueries();
    const start = Date.now();
    let executed = 0;
    while (queries.length > 0 && executed < executions && Date.now() - start < budget) {
      const result = await this.engine.query(queries[executed % queries.length], this.context);
      const { data } = await this.engine.resultToString(result, EndpointWarmup.MEDIA_TYPE);
      await EndpointWarmup.consume(data);
      executed++;
    }
    return { queries: queries.length, executions: executed };
  }

  protected async select(query: string): Promise<RDF.Bindings[]> {
    return (await this.engine.queryBindings(query, this.context)).toArray();
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
