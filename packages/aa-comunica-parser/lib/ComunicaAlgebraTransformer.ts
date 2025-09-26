import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { translateGraphPattern, accumulateGroupGraphPattern } from '@traqula/algebra-transformations-1-1';
import type { AlgebraIndir, ContextConfigs } from '@traqula/algebra-transformations-1-1';
import type { Algebra } from '@traqula/algebra-transformations-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import { IndirBuilder } from '@traqula/core';
import type * as T11 from '@traqula/rules-sparql-1-1';
import type * as T12 from '@traqula/rules-sparql-1-2';
import type { Lateral, Operation } from './ComunicaAlgebra';
import type { Pattern } from './ComunicaSparqlAst';

export const accumulateGroupGraphPatternNew:
AlgebraIndir<(typeof accumulateGroupGraphPattern)['name'], Operation, [Operation, Pattern]> = {
  name: 'accumulateGroupGraphPattern',
  fun: $ => (C, algebraOp, pattern) => {
    if (pattern.subType === 'lateral') {
      return {
        type: 'lateral',
        metadata: {},
        input: [
          <Algebra.Operation> algebraOp,
          $.SUBRULE(translateGraphPattern, C.astFactory.patternGroup(<T11.Pattern[]> pattern.patterns, pattern.loc)),
        ],
      }satisfies Lateral;
    }
    return accumulateGroupGraphPattern.fun($)(C, <Algebra.Operation> algebraOp, <T11.Pattern> pattern);
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
