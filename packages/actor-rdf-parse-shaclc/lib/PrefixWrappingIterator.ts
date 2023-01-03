import type { Quad } from '@rdfjs/types';
import { WrappingIterator } from 'asynciterator';

/**
 * An iterator that emits prefixes on the first read call where prefixes are available
 */
export class PrefixWrappingIterator extends WrappingIterator<Quad> {
  private prefixes?: Record<string, string>;
  public constructor(source: Promise<Quad[] & { prefixes: Record<string, string> }> | undefined) {
    super(source?.then(src => {
      this.prefixes = src.prefixes;
      return src;
    }));
  }

  public read(): Quad | null {
    // On the first read where the prefixes are available, emit them
    if (this.prefixes) {
      for (const args of Object.entries(this.prefixes)) {
        this.emit('prefix', ...args);
      }
      delete this.prefixes;
    }

    return super.read();
  }
}
