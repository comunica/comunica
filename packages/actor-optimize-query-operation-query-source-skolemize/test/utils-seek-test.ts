import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { skolemizeBindingsStream } from '../lib/utils';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const v = DF.variable('v');

describe('skolemizeBindingsStream seek forwarding', () => {
  it('leaves a stream that cannot skip alone', () => {
    const inner: any = new ArrayIterator([], { autoStart: false });
    const out: any = skolemizeBindingsStream(DF, inner, '0');
    expect(out.seek).toBeUndefined();
  });

  it('deskolemizes the target before forwarding it', () => {
    const sought: any[] = [];
    const inner: any = new ArrayIterator([], { autoStart: false });
    inner.seek = (target: any) => sought.push(target);
    const out: any = skolemizeBindingsStream(DF, inner, '0');

    out.seek(BF.bindings([[ v, DF.namedNode('urn:comunica_skolem:source_0:b1') ]]));
    expect(sought).toHaveLength(1);
    expect(sought[0].get(v)).toEqual(DF.blankNode('b1'));
  });

  it('passes a term that was never skolemized through unchanged', () => {
    const sought: any[] = [];
    const inner: any = new ArrayIterator([], { autoStart: false });
    inner.seek = (target: any) => sought.push(target);
    const out: any = skolemizeBindingsStream(DF, inner, '0');

    const target = BF.bindings([[ v, DF.namedNode('http://example.org/s') ]]);
    out.seek(target);
    expect(sought).toEqual([ target ]);
  });

  it('does not skip at all for a term skolemized by another source', () => {
    const sought: any[] = [];
    const inner: any = new ArrayIterator([], { autoStart: false });
    inner.seek = (target: any) => sought.push(target);
    const out: any = skolemizeBindingsStream(DF, inner, '0');

    out.seek(BF.bindings([[ v, DF.namedNode('urn:comunica_skolem:source_1:b1') ]]));
    expect(sought).toEqual([]);
  });
});
