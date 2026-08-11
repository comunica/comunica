import type { BindingsStream, IMetadata, MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * Return a cached callback to the metadata from the given quad stream as a promise.
 * @param data A quad stream.
 */
export function getMetadataQuads(data: AsyncIterator<RDF.Quad>): () => Promise<MetadataQuads> {
  return cachifyMetadata(() => new Promise<Record<string, any>>((resolve, reject) => {
    data.getProperty('metadata', (metadata: Record<string, any>) => resolve(metadata));
    data.on('error', reject);
  }).then(metadataRaw => validateMetadataQuads(metadataRaw)));
}

/**
 * Return a cached callback to the metadata from the given bindings stream as a promise.
 * @param data A bindings stream.
 */
export function getMetadataBindings(data: BindingsStream): () => Promise<MetadataBindings> {
  return cachifyMetadata(() => new Promise<Record<string, any>>((resolve, reject) => {
    data.getProperty('metadata', (metadata: Record<string, any>) => resolve(metadata));
    data.on('error', reject);
  }).then(metadataRaw => validateMetadataBindings(metadataRaw)));
}

/**
 * Ensure that the given raw metadata object contains all required metadata entries.
 * @param metadataRaw A raw metadata object.
 */
export function validateMetadataQuads(metadataRaw: Record<string, any>): MetadataQuads {
  for (const key of [ 'cardinality' ]) {
    if (!(key in metadataRaw)) {
      throw new Error(`Invalid metadata: missing ${key} in ${JSON.stringify(metadataRaw)}`);
    }
  }
  return <MetadataQuads> metadataRaw;
}

/**
 * Ensure that the given raw metadata object contains all required metadata entries.
 * @param metadataRaw A raw metadata object.
 */
export function validateMetadataBindings(metadataRaw: Record<string, any>): MetadataBindings {
  for (const key of [ 'cardinality', 'variables' ]) {
    if (!(key in metadataRaw)) {
      throw new Error(`Invalid metadata: missing ${key} in ${JSON.stringify(metadataRaw)}`);
    }
  }
  return <MetadataBindings> metadataRaw;
}

/**
 * Defer the computation of the 'metadata' property of a stream
 * until the property is requested for the first time via `getProperty`.
 *
 * This avoids computing metadata (which may for example require expensive cardinality counting)
 * for streams of which the metadata is never consumed,
 * such as bindings streams of bound operations within a bind-join.
 *
 * @param data The stream to defer the metadata computation of.
 * @param compute A callback that computes the metadata,
 *                and eventually assigns it via `data.setProperty('metadata', ...)`.
 *                It is invoked at most once,
 *                synchronously upon the first `getProperty` call involving 'metadata'.
 */
export function deferMetadata(data: AsyncIterator<any>, compute: () => void): void {
  // eslint-disable-next-line ts/unbound-method
  const originalGetProperty = data.getProperty;
  let pending = true;
  data.getProperty = function<P>(this: AsyncIterator<any>, propertyName: string, listener?: (value: P) => void):
  P | undefined {
    if (pending && propertyName === 'metadata') {
      pending = false;
      this.getProperty = originalGetProperty;
      compute();
    }
    return <P | undefined> originalGetProperty.call(this, propertyName, <((value: any) => void) | undefined> listener);
  };
}

/**
 * Convert a metadata callback to a lazy callback where the response value is cached.
 * @param {() => Promise<IMetadata>} metadata A metadata callback
 * @return {() => Promise<{[p: string]: any}>} The callback where the response will be cached.
 */
export function cachifyMetadata<M extends IMetadata<T>, T extends RDF.Variable | RDF.QuadTermName>(
  metadata: () => Promise<M>,
): () => Promise<M> {
  let lastReturn: Promise<M> | undefined;
  return () => {
    if (!lastReturn) {
      lastReturn = metadata();
      lastReturn
        .then(lastReturnValue => lastReturnValue.state.addInvalidateListener(() => {
          lastReturn = undefined;
        }))
        .catch(() => {
        // Ignore error
        });
    }
    return lastReturn;
  };
}
