/**
 * Grammar patch for constructQuery to support quad patterns in CONSTRUCT templates.
 * This extends the SPARQL 1.1 constructQuery rule to allow GRAPH clauses in CONSTRUCT
 * templates, e.g.:
 *   CONSTRUCT { GRAPH ?g { ?s ?p ?o } } WHERE { ... }
 *   CONSTRUCT WHERE { GRAPH ?g { ?s ?p ?o } }
 *
 * The patched rule stores the raw quad AST in a `_quadsTemplate` field on the parsed
 * AST node. ActorQueryParseSparql post-processes this into the algebra.
 */

import { gram, lex } from '@traqula/rules-sparql-1-1';

function buildWhere(F: any, quads: any[]): any {
  const wherePatterns = quads.map((item: any) => F.isGraphQuads(item) ?
    F.patternGraph(item.graph, [ item.triples ], item.loc) :
    item);
  return F.patternGroup(wherePatterns, F.sourceLocation());
}

export const constructQueryWithQuads = {
  name: 'constructQuery',
  impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }: any) => (C: any): any => {
    const construct = CONSUME(lex.construct);
    return OR([
      {
        ALT: (): any => {
          // Explicit form: CONSTRUCT { quadPattern } [datasets] WHERE { where }
          const template = SUBRULE1(gram.quadPattern);
          const from = SUBRULE1(gram.datasetClauseStar);
          const where = SUBRULE1(gram.whereClause);
          const modifiers = SUBRULE1(gram.solutionModifier);
          return ACTION(() => {
            const F = C.astFactory;
            return {
              subType: 'construct',
              template: F.patternBgp([], F.sourceLocation()),
              _quadsTemplate: template.val,
              datasets: from,
              where: where.val,
              solutionModifiers: modifiers,
              loc: F.sourceLocation(
                construct,
                where,
                modifiers.group,
                modifiers.having,
                modifiers.order,
                modifiers.limitOffset,
              ),
            };
          });
        },
      },
      {
        ALT: (): any => {
          // Shorthand form: CONSTRUCT [datasets] WHERE { quadPattern }
          const from = SUBRULE2(gram.datasetClauseStar);
          CONSUME(lex.where);
          const template = SUBRULE2(gram.quadPattern);
          const modifiers = SUBRULE2(gram.solutionModifier);
          return ACTION(() => {
            const F = C.astFactory;
            return {
              subType: 'construct',
              template: F.patternBgp([], F.sourceLocation()),
              _quadsTemplate: template.val,
              datasets: from,
              where: buildWhere(F, template.val),
              solutionModifiers: modifiers,
              loc: F.sourceLocation(
                construct,
                template,
                modifiers.group,
                modifiers.having,
                modifiers.order,
                modifiers.limitOffset,
              ),
            };
          });
        },
      },
    ]);
  },
};
