import type { ParserBuildArgs, RuleDefReturn } from '@traqula/core';
import { createToken, GeneratorBuilder, LexerBuilder, ParserBuilder } from '@traqula/core';
import { sparql12GeneratorBuilder } from '@traqula/generator-sparql-1-2';
import { sparql12ParserBuilder } from '@traqula/parser-sparql-1-2';
import {
  lex as l12,
  completeParseContext,
  completeGeneratorContext,
  copyParseContext,
} from '@traqula/rules-sparql-1-2';
import type * as T12 from '@traqula/rules-sparql-1-2';
import type { PatternLateral } from './ComunicaSparqlAst';

// eslint-disable-next-line require-unicode-regexp
const lateral = createToken({ name: 'Lateral', pattern: /lateral/i, label: 'Lateral pattern' });
const lateralLexer = LexerBuilder
  .create(l12.sparql12LexerBuilder)
  .add(lateral);

const origGraphPatternNotTriplesParserRule = sparql12ParserBuilder.getRule('graphPatternNotTriples');
const origGraphPatternNotTriplesGeneratorRule = sparql12GeneratorBuilder.getRule('graphPatternNotTriples');

const graphPatternNotTriples: T12.SparqlRule<
  typeof origGraphPatternNotTriplesParserRule['name'],
  RuleDefReturn<typeof origGraphPatternNotTriplesParserRule> | PatternLateral
> = {
  name: 'graphPatternNotTriples',
  impl: $ => C => $.OR2<RuleDefReturn<typeof graphPatternNotTriples>>([
    { ALT: () => $.SUBRULE(lateralGraphPattern) },
    { ALT: () => origGraphPatternNotTriplesParserRule.impl($)(C) },
  ]),
  gImpl: $ => (ast, c) => {
    if (ast.subType === 'lateral') {
      $.SUBRULE(lateralGraphPattern, ast);
    } else {
      origGraphPatternNotTriplesGeneratorRule.gImpl($)(ast, c);
    }
  },
};

const origGroupGraphPatternParserRule = sparql12ParserBuilder.getRule('groupGraphPattern');
const origGroupGraphPatternGeneratorRule = sparql12GeneratorBuilder.getRule('groupGraphPattern');

const lateralGraphPattern: T12.SparqlRule<'lateralGraphPattern', PatternLateral> = {
  name: 'lateralGraphPattern',
  impl: ({ CONSUME, SUBRULE, ACTION }) => (C) => {
    const token = CONSUME(lateral);
    const group = SUBRULE(origGroupGraphPatternParserRule);
    return ACTION(() => ({
      type: 'pattern',
      subType: 'lateral',
      patterns: group.patterns,
      loc: C.astFactory.sourceLocation(token, group),
    } satisfies PatternLateral));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('LATERAL'));
    SUBRULE(origGroupGraphPatternGeneratorRule, {
      type: 'pattern',
      subType: 'group',
      patterns: <T12.Pattern[]> ast.patterns,
      loc: ast.loc,
    });
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
  protected readonly defaultContext: T12.SparqlContext;
  public constructor(
    args: Pick<ParserBuildArgs, 'parserConfig' | 'lexerConfig'> & { defaultContext?: Partial<T12.SparqlContext> } = {},
  ) {
    this.parser = comunicaParserBuilder.build({
      ...args,
      tokenVocabulary: lateralLexer.tokenVocabulary,
    });
    this.defaultContext = completeParseContext(args.defaultContext ?? {});
  }

  public parse(query: string, context: Partial<T12.SparqlContext> = {}): T12.SparqlQuery {
    return this.parser.queryOrUpdate(query, copyParseContext({ ...this.defaultContext, ...context }));
  }
}

export class ComunicaSparqlGenerator {
  private readonly generator: ComunicaGenerator = comunicaGeneratorBuilder.build();

  public generate(
    ast: T12.SparqlQuery,
    context: Partial<T12.SparqlContext & { origSource: string }> = {},
  ): string {
    return this.generator.queryOrUpdate(ast, completeGeneratorContext(context));
  }
}
