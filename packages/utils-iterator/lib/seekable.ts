import type { Bindings, BindingsStream, ISeekableBindingsStream } from '@comunica/types';

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
