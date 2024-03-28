import type { BindingsStream } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator } from 'asynciterator';
import { MarkableIterator } from './MarkableIterator';

/**
 * An iterator that joins two bindings streams in a sort-merge manner.
 * This assumes that the two streams are sorted in the same manner.
 * Inspired by https://en.wikipedia.org/wiki/Sort-merge_join#Pseudocode
 *
 * The marker on left is needed to handle cases where multiple equal
 * bindings occur after each other (in left and/or right).
 * We can go back to the marker to allow multiple iterations to happen
 * over the same subsequence of bindings.
 */
export class SortMergeJoinIterator extends BufferedIterator<RDF.Bindings> {
  protected readonly left: MarkableIterator<RDF.Bindings>;
  protected readonly right: BindingsStream;
  protected lastLeft: RDF.Bindings | undefined | null;
  protected lastRight: RDF.Bindings | undefined | null;
  protected markedLeft: RDF.Bindings | undefined | null;
  protected advanceLeftOnly = false;

  public constructor(
    left: BindingsStream,
    right: BindingsStream,
    protected readonly funcJoin: (...bindings: RDF.Bindings[]) => RDF.Bindings | null,
    protected readonly funcCompare: (left: RDF.Bindings, right: RDF.Bindings) => number,
  ) {
    super();
    this.left = new MarkableIterator(left, { autoStart: false });
    this.right = right;

    this.left.on('readable', () => this.readable = true);
    this.right.on('readable', () => this.readable = true);
    this.left.on('end', () => {
      if (this.canEnd()) {
        this.close();
      }
    });
    this.right.on('end', () => {
      if (this.canEnd()) {
        this.close();
      }
    });
  }

  protected canEnd(): boolean {
    return (this.left.ended && !this.lastLeft && !this.markedLeft) || (this.right.ended && !this.lastRight);
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);

    // Ensure left and right are closed, because one of them may not be fully consumed yet.
    this.left.close();
    this.right.close();
  }

  protected override _read(count: number, done: () => void): void {
    while (true) {
      // Read left
      if (!this.lastLeft) {
        this.lastLeft = this.left.read();

        // Stop reading only from left is left is fully consumed
        if (!this.lastLeft && this.left.isSourceEnded()) {
          this.advanceLeftOnly = false;
          this.lastRight = null;
        }

        // Close if needed
        if (!this.lastLeft && this.canEnd()) {
          this.close();
          done();
          return;
        }
      }

      // Read right
      if (!this.advanceLeftOnly && !this.lastRight) {
        this.lastRight = this.right.read();
      }

      // If a marker has been set on left
      if (!this.advanceLeftOnly && this.markedLeft && this.lastRight) {
        if (this.funcCompare(this.markedLeft, this.lastRight) === 0) {
          // Restore left marker if the marked left is equal to right
          this.left.restoreMark();
          this.readable = true;
          this.lastLeft = this.markedLeft;
          this.markedLeft = null;
        } else {
          // If they are unequal, clear the marker
          this.left.clearMark();
          this.markedLeft = null;
        }
      }

      // Try to join if we could read left and right
      if (this.lastLeft && this.lastRight) {
        const compare = this.funcCompare(this.lastLeft, this.lastRight);
        if (compare === -1) {
          // Left was the smallest
          this.lastLeft = null;
          this.advanceLeftOnly = false;
          this.left.emit('skip', this.lastRight);
        } else if (compare === 1) {
          // Right was the smallest
          this.lastRight = null;
          this.advanceLeftOnly = false;
          this.right.emit('skip', this.lastLeft);
        } else {
          // Left and right are equal

          // Store a mark on left
          if (!this.markedLeft) {
            this.markedLeft = this.lastLeft;
            if (!this.left.hasMark()) {
              this.left.mark();
            }
          }

          // Attempt join
          const join = this.funcJoin(this.lastLeft, this.lastRight);

          // Advance left only (left is marked, so may be restored later!)
          this.lastLeft = null;
          this.advanceLeftOnly = true;

          // Push join if applicable
          if (join !== null) {
            // Push joined bindings
            this._push(join);

            if (--count <= 0) {
              break;
            }
          }
        }
      } else {
        break;
      }
    }

    done();
  }
}
