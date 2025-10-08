import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import type { AlgebraIndir, ContextConfigs, Algebra } from '@traqula/algebra-transformations-1-2';
import { IndirBuilder } from '@traqula/core';
import type * as T12 from '@traqula/rules-sparql-1-2';
import type { Lateral } from './ComunicaAlgebra';
import type { Pattern } from './ComunicaSparqlAst';

const origAccumulateGroupGraphPattern = toAlgebra12Builder.getRule('accumulateGroupGraphPattern');
const origTranslateGraphPattern = toAlgebra12Builder.getRule('translateGraphPattern');

export const accumulateGroupGraphPatternNew:
AlgebraIndir<'accumulateGroupGraphPattern', Algebra.Operation | Lateral, [Algebra.Operation, Pattern]> = {
  name: 'accumulateGroupGraphPattern',
  fun: $ => (C, algebraOp, pattern) => {
    if (pattern.subType === 'lateral') {
      return {
        type: 'lateral',
        input: [
          algebraOp,
          $.SUBRULE(origTranslateGraphPattern, C.astFactory.patternGroup(<any[]> pattern.patterns, pattern.loc)),
        ],
      } satisfies Lateral;
    }
    return origAccumulateGroupGraphPattern.fun($)(C, algebraOp, pattern);
  },
};

const algebraBuilderComunica = IndirBuilder
  .create(toAlgebra12Builder)
  .patchRule(accumulateGroupGraphPatternNew);

export function toComunicaAlgebra(query: T12.SparqlQuery, options: ContextConfigs = {}): Algebra.Operation {
  const c = createAlgebraContext(options);
  const transformer = algebraBuilderComunica.build();
  return transformer.translateQuery(c, query, options.quads, options.blankToVariable);
}
