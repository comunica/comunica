import type { Bindings, ISeekableBindingsStream, TermsOrder } from '@comunica/types';
import { compareTerms, seekBindingsStream } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';

const UNDECIDED = 0;
const PLAIN = 1;
const ORDERED = 2;

/**
 * A union that emits the bindings of its inputs in the term order they share, or in no particular order.
 *
 * Which of the two it does is decided once, by whichever comes first:
 * a call to {@link OrderedUnionIterator#useOrder}, or the first read.
 * A consumer that relies on the order asks for metadata before reading, which is where the order is decided on.
 *
 * In order, it holds the next binding of every input and emits the smallest one,
 * so it can only emit once every input that has not ended has a binding available.
 */
export class OrderedUnionIterator extends AsyncIterator<Bindings> implements ISeekableBindingsStream {
  private readonly sources: AsyncIterator<Bindings>[];
  // Undefined if not read yet, null if ended.
  private readonly heads: (Bindings | null | undefined)[];
  private mode = UNDECIDED;
  private order: TermsOrder<RDF.Variable> | undefined;
  private nextSource = 0;

  /**
   * @param sources The inputs.
   */
  public constructor(sources: AsyncIterator<Bindings>[]) {
    super();
    this.sources = sources;
    this.heads = Array.from({ length: sources.length });
    for (const source of sources) {
      source.on('error', error => this.destroy(error));
      source.on('readable', () => {
        this.readable = true;
      });
      source.on('end', () => {
        this.readable = true;
      });
    }
    this.readable = true;
  }

  /**
   * Emit the bindings in the given order, unless reading has already started without one.
   * @param order The term order that all inputs are sorted on, or undefined if they share none.
   * @return The order that the bindings are emitted in, if any.
   */
  public useOrder(order: TermsOrder<RDF.Variable> | undefined): TermsOrder<RDF.Variable> | undefined {
    if (this.mode === UNDECIDED) {
      this.mode = order ? ORDERED : PLAIN;
      this.order = order;
    }
    return this.order;
  }

  /**
   * Compare two bindings in the order, up to the first order variable that `right` does not bind.
   * @param left Bindings that bind all order variables.
   * @param right Bindings that may only bind a prefix of the order variables, such as a seek target.
   */
  protected compare(left: Bindings, right: Bindings): number {
    for (const { term, direction } of this.order!) {
      const rightTerm = right.get(term);
      if (!rightTerm) {
        return 0;
      }
      const comparison = compareTerms(left.get(term)!, rightTerm);
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  }

  public override read(): Bindings | null {
    if (this.done) {
      return null;
    }
    if (this.mode === UNDECIDED) {
      this.mode = PLAIN;
    }
    return this.mode === ORDERED ? this.readOrdered() : this.readPlain();
  }

  /**
   * Read from the inputs in turn.
   */
  protected readPlain(): Bindings | null {
    let pending = false;
    for (let i = 0; i < this.sources.length; i++) {
      const index = (this.nextSource + i) % this.sources.length;
      const source = this.sources[index];
      if (!source.done) {
        const item = source.read();
        if (item !== null) {
          this.nextSource = (index + 1) % this.sources.length;
          return item;
        }
        pending ||= !source.done;
      }
    }
    if (pending) {
      this.readable = false;
    } else {
      this._end();
    }
    return null;
  }

  /**
   * Read the smallest of the next bindings of all inputs.
   */
  protected readOrdered(): Bindings | null {
    let min = -1;
    for (let i = 0; i < this.sources.length; i++) {
      let head = this.heads[i];
      if (head === undefined) {
        const source = this.sources[i];
        head = source.read();
        if (head === null && !source.done) {
          this.readable = false;
          return null;
        }
        this.heads[i] = head;
      }
      if (head !== null && (min < 0 || this.compare(head, <Bindings> this.heads[min]) < 0)) {
        min = i;
      }
    }
    if (min < 0) {
      this._end();
      return null;
    }
    const item = <Bindings> this.heads[min];
    this.heads[min] = undefined;
    return item;
  }

  public seek(target: Bindings): void {
    // A seek may skip fewer bindings than it could, so without an order it skips none.
    if (this.mode !== ORDERED) {
      return;
    }
    for (let i = 0; i < this.sources.length; i++) {
      const head = this.heads[i];
      if (head !== null && (head === undefined || this.compare(head, target) < 0)) {
        this.heads[i] = undefined;
        seekBindingsStream(this.sources[i], target);
      }
    }
    this.readable = true;
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    for (const source of this.sources) {
      source.destroy();
    }
  }
}
