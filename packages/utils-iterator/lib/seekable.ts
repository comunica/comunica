import type { Bindings, BindingsStream, ISeekableBindingsStream } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { MappingIterator } from 'asynciterator';

/**
 * Whether a stream of bindings can skip ahead.
 * @param stream The stream to check.
 */
export function isSeekableBindingsStream(stream: BindingsStream): stream is ISeekableBindingsStream {
  return typeof (<ISeekableBindingsStream> stream).seek === 'function';
}

/**
 * Ask a stream of bindings to skip ahead, and do nothing if it cannot.
 * @param stream The stream to skip ahead.
 * @param target The binding to skip to.
 */
export function seekBindingsStream(stream: BindingsStream, target: Bindings): void {
  if (isSeekableBindingsStream(stream)) {
    stream.seek(target);
  }
}

/**
 * A stream of bindings that maps another stream one to one, keeping its order,
 * and forwards seeks to it through the given function.
 */
export class SeekableMappingIterator<S> extends MappingIterator<S, Bindings> implements ISeekableBindingsStream {
  private readonly seekSource: (target: Bindings) => void;

  /**
   * @param source The stream to map.
   * @param map Maps an item of the source to bindings.
   * @param seekSource Asks the source to skip ahead to the given bindings.
   */
  public constructor(
    source: AsyncIterator<S>,
    map: (item: S) => Bindings,
    seekSource: (target: Bindings) => void,
  ) {
    super(source, map);
    this.seekSource = seekSource;
  }

  public seek(target: Bindings): void {
    this.seekSource(target);
  }
}
