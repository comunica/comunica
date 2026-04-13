import type * as RDF from '@rdfjs/types';
import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import {
  generateFreshVar,
  inScopeVariables,
  mapAggregate,
  translateBasicGraphPattern,
  translateBoundAggregate,
  translateDatasetClause,
  translateExpression,
  translateInlineData,
  translateQuad,
  translateTerm,
} from '@traqula/algebra-transformations-1-1';
import type { Algebra, AstToRdfTerm, translateAggregates } from '@traqula/algebra-transformations-1-1';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import type { ContextConfigs } from '@traqula/algebra-transformations-1-2';
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

/**
 * Patched version of translateAggregates that handles CONSTRUCT templates with GRAPH clauses.
 * The standard template type is PatternBgp, but our patched parser produces
 * (PatternBgp | PatternGraph)[] to support CONSTRUCT { GRAPH ?g { ... } } syntax.
 */
const patchedTranslateAggregates: typeof translateAggregates = {
  name: 'translateAggregates',
  fun: ({ SUBRULE }) => ({ astFactory: F, algebraFactory: AF, dataFactory: DF }, query, res): Algebra.Operation => {
    const bindPatterns: T11.PatternBind[] = [];

    const varAggrMap: Record<string, T11.ExpressionAggregate> = {};
    const variables = F.isQuerySelect(query) || F.isQueryDescribe(query) ?
      query.variables.map(x => SUBRULE(mapAggregate, x, varAggrMap)) :
      undefined;
    const having = query.solutionModifiers.having ?
      query.solutionModifiers.having.having.map(x => <typeof x>SUBRULE(mapAggregate, x, varAggrMap)) :
      undefined;
    const order = query.solutionModifiers.order ?
      query.solutionModifiers.order.orderDefs.map(x => <typeof x>SUBRULE(mapAggregate, x, varAggrMap)) :
      undefined;

    // Step: GROUP BY - If we found an aggregate, in group by or implicitly, do Group function.
    // 18.2.4.1 Grouping and Aggregation
    if (query.solutionModifiers.group ?? Object.keys(varAggrMap).length > 0) {
      const aggregates = Object.keys(varAggrMap).map(var_ =>
        SUBRULE(translateBoundAggregate, varAggrMap[var_], DF.variable(var_)));
      const vars: RDF.Variable[] = [];
      if (query.solutionModifiers.group) {
        for (const expression of query.solutionModifiers.group.groupings) {
          // https://www.w3.org/TR/sparql11-query/#rGroupCondition
          if (F.isTerm(expression)) {
            // This will always be a var, otherwise sparql would be invalid
            vars.push(<RDF.Variable>SUBRULE(translateTerm, expression));
          } else {
            let var_: RDF.Variable;
            let expr: T11.Expression;
            if ('variable' in expression) {
              var_ = <AstToRdfTerm<typeof expression.variable>>SUBRULE(translateTerm, expression.variable);
              expr = expression.value;
            } else {
              var_ = SUBRULE(generateFreshVar);
              expr = expression;
            }
            res = AF.createExtend(res, var_, SUBRULE(translateExpression, expr));
            vars.push(var_);
          }
        }
      }
      res = AF.createGroup(res, vars, aggregates);
    }

    // 18.2.4.2
    if (having) {
      for (const filter of having) {
        res = AF.createFilter(res, SUBRULE(translateExpression, filter));
      }
    }

    // 18.2.4.3
    if (query.values) {
      res = AF.createJoin([ res, SUBRULE(translateInlineData, query.values) ]);
    }

    // 18.2.4.4
    let PatternValues: (RDF.Variable | RDF.NamedNode)[] = [];

    if (variables) {
      // Sort variables for consistent output
      if (variables.some(wild => F.isWildcard(wild))) {
        PatternValues = [ ...SUBRULE(inScopeVariables, query).values() ].map(x => DF.variable(x))
          .sort((left, right) => left.value.localeCompare(right.value));
      } else {
        // Wildcard has been filtered out above
        for (const var_ of <(T11.TermVariable | T11.TermIri | T11.PatternBind)[]> variables) {
          // Can have non-variables with DESCRIBE
          if (F.isTerm(var_)) {
            PatternValues.push(<AstToRdfTerm<typeof var_>>SUBRULE(translateTerm, var_));
          } else {
            // ... AS ?x
            PatternValues.push(<AstToRdfTerm<typeof var_.variable>>SUBRULE(translateTerm, var_.variable));
            bindPatterns.push(var_);
          }
        }
      }
    }

    // TODO: Jena simplifies by having a list of extends
    for (const bind of bindPatterns) {
      res = AF.createExtend(
        res,
          <AstToRdfTerm<typeof bind.variable>>SUBRULE(translateTerm, bind.variable),
          SUBRULE(translateExpression, bind.expression),
      );
    }

    // 18.2.5
    // not using toList and toMultiset

    // 18.2.5.1
    if (order) {
      res = AF.createOrderBy(res, order.map((expr) => {
        let result = SUBRULE(translateExpression, expr.expression);
        if (expr.descending) {
          result = AF.createOperatorExpression('desc', [ result ]);
        }
        return result;
      }));
    }

    // 18.2.5.2
    // construct does not need a project (select, ask and describe do)
    if (F.isQuerySelect(query)) {
      // Named nodes are only possible in a DESCRIBE so this cast is safe
      res = AF.createProject(res, <RDF.Variable[]> PatternValues);
    }

    // 18.2.5.3
    if ((<{ distinct?: unknown }>query).distinct) {
      res = AF.createDistinct(res);
    }

    // 18.2.5.4
    if ((<{ reduced?: unknown }>query).reduced) {
      res = AF.createReduced(res);
    }

    /// THIS IS THE PART THAT CHANGED
    if (F.isQueryConstruct(query)) {
      const constructQuads: Algebra.Pattern[] = [];
      const template = <(T11.PatternBgp | T11.PatternGraph)[]> <unknown> query.template;

      function processConstructTemplate(
        items: (T11.PatternBgp | T11.PatternGraph)[],
        graph?: any,
      ): void {
        for (const item of items) {
          if (F.isPatternBgp(item)) {
            let triples: any[] = [];
            SUBRULE(translateBasicGraphPattern, (item).triples, triples);
            if (graph) {
              triples = triples.map((t: any) => Object.assign(t, { graph }));
            }
            constructQuads.push(...triples.map((quad: any) => SUBRULE(translateQuad, quad)));
          } else if (F.isPatternGraph(item)) {
            const graphItem = item;
            const graphTerm = SUBRULE(translateTerm, graphItem.name);
            processConstructTemplate(
              <(T11.PatternBgp | T11.PatternGraph)[]> graphItem.patterns,
              graphTerm,
            );
          }
        }
      }

      processConstructTemplate(template);
      res = AF.createConstruct(res, constructQuads);
    } else if (F.isQueryAsk(query)) {
      res = AF.createAsk(res);
    } else if (F.isQueryDescribe(query)) {
      res = AF.createDescribe(res, PatternValues);
    }

    // Slicing needs to happen after construct/describe
    // 18.2.5.5
    const limitOffset = query.solutionModifiers.limitOffset;
    if (limitOffset?.limit ?? limitOffset?.offset) {
      res = AF.createSlice(res, limitOffset.offset ?? 0, limitOffset.limit);
    }

    if (query.datasets.clauses.length > 0) {
      const clauses = SUBRULE(translateDatasetClause, query.datasets);
      res = AF.createFrom(res, clauses.default, clauses.named);
    }

    return res;
  },
};

export const patchedAlgebraBuilder = toAlgebra12Builder
  .patchRule(patchedTranslateAggregates);

export function toAlgebraPatched(query: T12.SparqlQuery, options: ContextConfigs = {}): Algebra.Operation {
  const c = createAlgebraContext(options);
  const transformer = patchedAlgebraBuilder.build();
  return transformer.translateQuery(c, query, options.quads, options.blankToVariable);
}
