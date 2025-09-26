import type { RuleDefReturn } from '@traqula/core';
import { createToken, GeneratorBuilder, LexerBuilder, ParserBuilder } from '@traqula/core';
import { sparql12GeneratorBuilder } from '@traqula/generator-sparql-1-2';
import { sparql12ParserBuilder } from '@traqula/parser-sparql-1-2';
import { gram as g11 } from '@traqula/rules-sparql-1-1';
import type * as T11 from '@traqula/rules-sparql-1-1';
import { lex as l12, completeParseContext } from '@traqula/rules-sparql-1-2';
import type { SparqlQuery } from '@traqula/rules-sparql-1-2';
import type * as T12 from '@traqula/rules-sparql-1-2';
import type { PatternLateral } from './ComunicaSparqlAst';

// eslint-disable-next-line require-unicode-regexp
const lateral = createToken({ name: 'Lateral', pattern: /lateral/i, label: 'Lateral pattern' });
const lateralLexer = LexerBuilder
  .create(l12.sparql12LexerBuilder)
  .add(lateral);

const graphPatternNotTriples: T12.SparqlRule<
  (typeof g11.graphPatternNotTriples)['name'],
Exclude<T11.Pattern, T11.SubSelect | T11.PatternBgp> | PatternLateral
> = {
  name: 'graphPatternNotTriples',
  impl: $ => C => $.OR2<RuleDefReturn<typeof graphPatternNotTriples>>([
    { ALT: () => $.SUBRULE(lateralGraphPattern) },
    { ALT: () => g11.graphPatternNotTriples.impl($)(C) },
  ]),
  gImpl: $ => (ast, c) => {
    if (ast.subType === 'lateral') {
      $.SUBRULE(lateralGraphPattern, ast);
    } else {
      g11.graphPatternNotTriples.gImpl($)(ast, c);
    }
  },
};

const lateralGraphPattern: T12.SparqlRule<'lateralGraphPattern', PatternLateral> = {
  name: 'lateralGraphPattern',
  impl: ({ CONSUME, SUBRULE, ACTION }) => (C) => {
    const token = CONSUME(lateral);
    const group = SUBRULE(g11.groupGraphPattern);
    return ACTION(() => ({
      type: 'pattern',
      subType: 'lateral',
      patterns: group.patterns,
      loc: C.astFactory.sourceLocation(token, group),
    } satisfies PatternLateral));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('LATERAL'));
    SUBRULE(g11.groupGraphPattern, F.patternGroup(<T11.Pattern[]>ast.patterns, ast.loc));
  },
};

const comunicaParserBuilder = ParserBuilder.create(sparql12ParserBuilder)
  .patchRule(graphPatternNotTriples)
  .addRule(lateralGraphPattern);

const comunicaGeneratorBuilder = GeneratorBuilder.create(sparql12GeneratorBuilder)
  .patchRule(graphPatternNotTriples)
  .addRule(lateralGraphPattern);

type ComunicaParser = ReturnType<typeof comunicaParserBuilder.build>;
type ComunicaGenerator = ReturnType<typeof comunicaGeneratorBuilder.build>;

export class ComunicaSparqlParser {
  private readonly parser: ComunicaParser;
  public constructor() {
    this.parser = comunicaParserBuilder.build({
      tokenVocabulary: lateralLexer.tokenVocabulary,
    });
  }

  public parse(query: string, context: Partial<T12.SparqlContext> = {}): SparqlQuery {
    return this.parser.queryOrUpdate(query, completeParseContext(context));
  }
}

export class ComunicaSparqlGenerator {
  private readonly generator: ComunicaGenerator = comunicaGeneratorBuilder.build();

  public generate(
    ast: T12.SparqlQuery,
    context: Partial<T12.SparqlContext & { origSource: string }> = {},
  ): string {
    return this.generator.queryOrUpdate(ast, completeParseContext(context));
  }
}
