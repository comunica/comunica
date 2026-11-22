import { MetadataValidationState } from '@comunica/utils-metadata';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { skolemizeBindingsStream, skolemizeQuadStream } from '../lib/utils';

const DF = new DataFactory();

describe.each([
  [ 'skolemizeBindingsStream', (iterator: AsyncIterator<any>) => skolemizeBindingsStream(DF, iterator, '1') ],
  [ 'skolemizeQuadStream', (iterator: AsyncIterator<any>) => skolemizeQuadStream(DF, iterator, '1') ],
])('%s metadata', (_name, skolemize) => {
  const getMetadata = (iterator: AsyncIterator<any>): Promise<any> =>
    new Promise(resolve => iterator.getProperty('metadata', resolve));

  it('only inherits the metadata once it is requested', async() => {
    const inner = new ArrayIterator<any>([], { autoStart: false });
    const getProperty = jest.spyOn(inner, 'getProperty');
    const skolemized = skolemize(inner);
    expect(getProperty).not.toHaveBeenCalled();

    const metadata = { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }};
    inner.setProperty('metadata', metadata);
    await expect(getMetadata(skolemized)).resolves.toBe(metadata);
    expect(getProperty).toHaveBeenCalledTimes(1);
  });

  it('inherits the metadata again after it is invalidated', async() => {
    const inner = new ArrayIterator<any>([], { autoStart: false });
    const skolemized = skolemize(inner);
    const metadata1 = { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 1 }};
    inner.setProperty('metadata', metadata1);
    await expect(getMetadata(skolemized)).resolves.toBe(metadata1);

    const metadata2 = { state: new MetadataValidationState(), cardinality: { type: 'exact', value: 2 }};
    inner.setProperty('metadata', metadata2);
    metadata1.state.invalidate();
    await new Promise(resolve => setImmediate(resolve));
    await expect(getMetadata(skolemized)).resolves.toBe(metadata2);
  });
});
