import {BufferedIterator, BufferedIteratorOptions} from "asynciterator";
import * as RDF from "rdf-js";

/**
 * An abstract quad iterator that iterates over several pages.
 */
export abstract class PagedAsyncRdfIterator extends BufferedIterator<RDF.Quad> implements RDF.Stream {

  private readonly startUrl: string;
  private nextUrl: string;
  private page: number;

  constructor(startUrl: string, options?: BufferedIteratorOptions) {
    super(options);
    this.page = 0;
    this.startUrl = startUrl;
    this.nextUrl = startUrl;
  }

  public _read(count: number, done: () => void) {
    if (this.nextUrl) {
      this.startIterator(this.nextUrl, this.page++)
        .then(done)
        .catch((e) => this.emit('error', e));
    } else {
      done();
    }
  }

  /**
   * Create a new iterator for the given url, with the given page id.
   * @param {string} url The URL for which a quad iterator shuld be created.
   * @param {number} page The numerical page id. The first page is always page 0.
   * @param {(nextPage: string) => void} onNextPage A callback for when the next page url has been determined.
   *                                                This may be falsy if the last page was found
   * @return {Promise<RDF.Stream>} A promise that resolves to the quad data stream for the given page.
   */
  protected abstract getIterator(url: string, page: number, onNextPage: (nextPage?: string) => void)
  : Promise<RDF.Stream>;

  /**
   * Start an iterator for the given page and inherit all its data elements and error event.
   * @param {string} url The URL for which a quad iterator should be created.
   * @param {number} page The numerical page id. The first page is always page 0.
   * @return {Promise<any>} A promise that resolves when a new iterator was started (but not necessarily ended).
   */
  protected async startIterator(url: string, page: number): Promise<any> {
    this.nextUrl = null;
    let ended: boolean = false;
    let shouldClose: boolean = false;
    const it: RDF.Stream = await this.getIterator(url, page, (nextPage?: string) => {
      if (nextPage) {
        this.nextUrl = nextPage;
        this.readable = true;
      } else {
        if (!ended) {
          shouldClose = true;
        } else {
          this.close();
        }
      }
    });

    it.on('data', (quad: RDF.Quad) => {
      this._push(quad);
      this.readable = true;
    });

    it.on('error', (e: Error) => this.emit('error', e));

    it.on('end', () => {
      ended = true;
      if (shouldClose) {
        this.close();
      }
    });
  }
}
