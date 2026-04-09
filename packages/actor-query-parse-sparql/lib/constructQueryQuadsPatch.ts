import type { Wrap, ParserBuildArgs } from '@traqula/core';
import { sparql12ParserBuilder } from '@traqula/parser-sparql-1-2';
import { lex as l11, gram as g11, sparqlCodepointEscape } from '@traqula/rules-sparql-1-1';
import type * as T11 from '@traqula/rules-sparql-1-1';
import { completeParseContext, copyParseContext, lex as l12 } from '@traqula/rules-sparql-1-2';
import type * as T12 from '@traqula/rules-sparql-1-2';

export type QueryConstruct = Omit<T12.QueryConstruct, 'template'> & {
  template: (T12.PatternBgp | T12.PatternGraph)[];
};

const origConstructQuery = sparql12ParserBuilder.getRule('constructQuery');
const origConstructTemplate = sparql12ParserBuilder.getRule('constructTemplate');

/**
 * [[10]](https://www.w3.org/TR/sparql11-query/#rConstructQuery)
 */
export const constructQuery:
T12.SparqlGrammarRule<typeof origConstructQuery['name'], Omit<QueryConstruct, g11.HandledByBase>> = <const> {
  name: 'constructQuery',
  impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }) => (C) => {
    const construct = CONSUME(l11.construct);
    return OR([
      { ALT: () => {
        const template = SUBRULE1(constructTemplate);
        const from = SUBRULE1(g11.datasetClauseStar);
        const where = SUBRULE1(g11.whereClause);
        const modifiers = SUBRULE1(g11.solutionModifier);
        return ACTION(() => ({
          subType: 'construct',
          template: template.val,
          datasets: from,
          where: where.val,
          solutionModifiers: modifiers,
          loc: C.astFactory.sourceLocation(
            construct,
            where,
            modifiers.group,
            modifiers.having,
            modifiers.order,
            modifiers.limitOffset,
          ),
        } satisfies Omit<QueryConstruct, g11.HandledByBase>));
      } },
      { ALT: () => {
        const from = SUBRULE2(g11.datasetClauseStar);
        CONSUME(l11.where);
        // ConstructTemplate is same as '{' TriplesTemplate? '}'
        const template = SUBRULE2(constructTemplate);
        const modifiers = SUBRULE2(g11.solutionModifier);

        return ACTION(() => ({
          subType: 'construct',
          template: template.val,
          datasets: from,
          where: C.astFactory.patternGroup(<T11.Pattern[]> template.val, C.astFactory.sourceLocation()),
          solutionModifiers: modifiers,
          loc: C.astFactory.sourceLocation(
            construct,
            template,
            modifiers.group,
            modifiers.having,
            modifiers.order,
            modifiers.limitOffset,
          ),
        }));
      } },
    ]);
  },
};

export const constructTemplate:
T12.SparqlGrammarRule<typeof origConstructTemplate['name'], Wrap<QueryConstruct['template']>> = <const> {
  name: 'constructTemplate',
  impl: ({ ACTION, SUBRULE, CONSUME, MANY, OR }) => (C) => {
    const open = CONSUME(l11.symbols.LCurly);
    const graphStuff: (T12.PatternBgp | T12.PatternGraph)[] = [];
    MANY(() => {
      const one = OR<T12.PatternBgp | T12.PatternGraph>([
        { ALT: () => SUBRULE(g11.constructTriples) },
        { ALT: () => {
          const graph = CONSUME(l11.graph.graph);
          const name = SUBRULE(g11.varOrIri);
          const group = SUBRULE(constructTemplate);
          return ACTION(() =>
            C.astFactory.patternGraph(name, <T11.Pattern[]> group.val, C.astFactory.sourceLocation(graph, group)));
        } },
      ]);
      graphStuff.push(one);
    });
    const close = CONSUME(l11.symbols.RCurly);

    return ACTION(() => C.astFactory.wrap(
      graphStuff,
      C.astFactory.sourceLocation(open, close),
    ));
  },
};

export const patchedParserBuilder = sparql12ParserBuilder
  .patchRule(constructQuery)
  .patchRule(constructTemplate)
  .typePatch<{
    [origConstructTemplate.name]: [Wrap<QueryConstruct['template']>];
  }>();
export type PatchedSparqlParser = ReturnType<typeof patchedParserBuilder.build>;

export class PatchedParser {
  private readonly parser: PatchedSparqlParser;
  protected readonly defaultContext: T12.SparqlContext;

  public constructor(args: Pick<ParserBuildArgs, 'parserConfig' | 'lexerConfig'>
      & { defaultContext?: Partial<T12.SparqlContext> } = {}) {
    this.parser = patchedParserBuilder.build({
      ...args,
      queryPreProcessor: sparqlCodepointEscape,
      tokenVocabulary: l12.sparql12LexerBuilder.tokenVocabulary,
    });
    this.defaultContext = completeParseContext(args.defaultContext ?? {});
  }

  /**
   * Parse a query string starting from the
   * [QueryUnit](https://www.w3.org/TR/sparql12-query/#rQueryUnit)
   * or [QueryUpdate](https://www.w3.org/TR/sparql12-query/#rUpdateUnit) rules.
   * @param query
   * @param context
   */
  public parse(query: string, context: Partial<T12.SparqlContext> = {}): T12.SparqlQuery {
    const ast = this.parser.queryOrUpdate(query, copyParseContext({ ...this.defaultContext, ...context }));
    ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query, ast.loc, 0, Number.MAX_SAFE_INTEGER);
    return ast;
  }

  /**
   * Parse a query string starting from the [Path](https://www.w3.org/TR/sparql12-query/#rPath) grammar rule.
   * @param query
   * @param context
   */
  public parsePath(
    query: string,
      context: Partial<T12.SparqlContext> = {},
  ): (T12.Path & { prefixes: object }) | T12.TermIri {
    const ast = this.parser.path(query, copyParseContext({ ...this.defaultContext, ...context }));
    ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query, ast.loc, 0, Number.MAX_SAFE_INTEGER);
    if (this.defaultContext.astFactory.isPathPure(ast)) {
      return {
        ...ast,
        prefixes: {},
      };
    }
    return ast;
  }
}
