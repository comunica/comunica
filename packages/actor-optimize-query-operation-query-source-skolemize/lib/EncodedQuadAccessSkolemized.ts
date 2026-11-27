import type { ComunicaDataFactory, IEncodedLookup, IEncodedQuadAccess } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { deskolemizeTerm, SKOLEM_PREFIX, skolemizeTerm } from './utils';

/**
 * Encoded access that skolemizes blank nodes like {@link QuerySourceSkolemized} does,
 * but only when terms are encoded or decoded, and not for every lookup.
 */
export class EncodedQuadAccessSkolemized implements IEncodedQuadAccess {
  public readonly encoding: unknown = this;
  private readonly inner: IEncodedQuadAccess;
  private readonly sourceId: string;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly blankNodes = new Map<number, RDF.Term>();
  // Skolemized blank nodes by their value, as such terms are recreated for every binding.
  private readonly blankNodeIds = new Map<string, number | undefined>();

  public constructor(inner: IEncodedQuadAccess, sourceId: string, dataFactory: ComunicaDataFactory) {
    this.inner = inner;
    this.sourceId = sourceId;
    this.dataFactory = dataFactory;
  }

  public encode(term: RDF.Term): number | undefined {
    if ((term.termType === 'NamedNode' || term.termType === 'Literal') && !term.value.startsWith(SKOLEM_PREFIX)) {
      return this.inner.encode(term);
    }
    if (term.termType === 'BlankNode' || term.termType === 'NamedNode') {
      const key = `${term.termType[0]}${term.value}`;
      if (this.blankNodeIds.has(key)) {
        return this.blankNodeIds.get(key);
      }
      const deskolemized = deskolemizeTerm(this.dataFactory, term, this.sourceId);
      const id = deskolemized ? this.inner.encode(deskolemized) : undefined;
      this.blankNodeIds.set(key, id);
      return id;
    }
    // Only named nodes and blank nodes are skolemized.
    return this.inner.encode(term);
  }

  public decode(id: number): RDF.Term {
    const term = this.inner.decode(id);
    if (term.termType !== 'BlankNode') {
      return term;
    }
    let skolemized = this.blankNodes.get(id);
    if (!skolemized) {
      skolemized = skolemizeTerm(this.dataFactory, term, this.sourceId);
      this.blankNodes.set(id, skolemized);
    }
    return skolemized;
  }

  public prepareLookup(bound: readonly [boolean, boolean, boolean, boolean]): IEncodedLookup | undefined {
    return this.inner.prepareLookup(bound);
  }
}
