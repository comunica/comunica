import * as HDT from "hdt";
import {Document, SearchLiteralsOpts, SearchLiteralsResult, SearchResult, SearchTermsOpts} from "hdt";
import {IStringQuad} from "rdf-string/lib/TermUtil";

export class MockedHdtDocument implements HDT.Document  {

  public closed: boolean = false;

  private readonly triples: IStringQuad[];
  private error: Error = null;

  constructor(triples: IStringQuad[]) {
    this.triples = triples;
  }

  protected static triplesMatch(a: IStringQuad, b: IStringQuad): boolean {
    return MockedHdtDocument.termsMatch(a.subject, b.subject)
      && MockedHdtDocument.termsMatch(a.predicate, b.predicate)
      && MockedHdtDocument.termsMatch(a.object, b.object);
  }

  protected static termsMatch(a: string, b: string): boolean {
    return MockedHdtDocument.isVariable(a) || MockedHdtDocument.isVariable(b) || a === b;
  }

  protected static isVariable(a: string): boolean {
    return !a || a.charAt(0) === '?' || a.charAt(0) === '_';
  }

  public async searchTriples(subject: string, predicate: string, object: string,
                             options: {[id: string]: any}): Promise<HDT.SearchResult> {
    if (this.error) {
      throw this.error;
    }
    const tripleIn = { subject, predicate, object };
    const offset = options.offset || 0;
    const limit = Math.min(options.limit, this.triples.length);
    let i = 0;
    const triples = [];
    for (const triple of this.triples) {
      if (MockedHdtDocument.triplesMatch(tripleIn, triple)) {
        if (i >= offset && i < offset + limit) {
          triples.push(triple);
        }
        i++;
      }
    }
    return { triples, totalCount: i, hasExactCount: true };
  }

  public async countTriples(sub?: string, pred?: string, obj?: string): Promise<SearchResult> {
    return null;
  }

  public async searchLiterals(substring: string, opts?: SearchLiteralsOpts): Promise<SearchLiteralsResult> {
    return null;
  }

  public searchTerms(opts?: SearchTermsOpts): Promise<string[]> {
    return null;
  }

  public async close(): Promise<void> {
    this.closed = true;
  }

  public setError(error: Error) {
    this.error = error;
  }

  public async readHeader(): Promise<string> {
    return null;
  }

  public async changeHeader(triples: string, outputFile: string): Promise<Document> {
    return null;
  }

}
