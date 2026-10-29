import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();

function named(object: string): ReturnType<DataFactory['quad']> {
  return DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode(object));
}

function blank(label: string, object: string): ReturnType<DataFactory['quad']> {
  return DF.quad(DF.blankNode(label), DF.namedNode('p'), DF.namedNode(object));
}

describe('toBeRdfIsomorphic', () => {
  it('should succeed for equal empty graphs', () => {
    expect([]).toBeRdfIsomorphic([]);
  });

  it('should succeed for equal graphs', () => {
    expect([ named('o1') ]).toBeRdfIsomorphic([ named('o1') ]);
  });

  it('should succeed for graphs with differently labelled blank nodes', () => {
    expect([ blank('a', 'o1') ]).toBeRdfIsomorphic([ blank('b', 'o1') ]);
  });

  it('should not succeed for graphs with a different quad', () => {
    expect([ named('o1') ]).not.toBeRdfIsomorphic([ named('o2') ]);
  });

  it('should not succeed for graphs with a different blank node pattern', () => {
    expect([ blank('a', 'o1') ]).not.toBeRdfIsomorphic([ blank('b', 'o2') ]);
  });

  it('should report the differing quads', () => {
    const check = (): unknown => expect([ named('o1') ]).toBeRdfIsomorphic([ named('o2') ]);
    const missing = '{"subject":"s","predicate":"p","object":"o2","graph":""}';
    const additional = '{"subject":"s","predicate":"p","object":"o1","graph":""}';
    expect(check).toThrow('expected two graphs to be isomorphic.');
    expect(check).toThrow(`Missing Quads (that don't contain Blank Nodes):\n[\n  ${missing}\n]`);
    expect(check).toThrow(`Additional Quads (that don't contain Blank Nodes):\n[\n  ${additional}\n]`);
  });

  it('should report the differing blank node patterns', () => {
    const check = (): unknown => expect([ blank('a', 'o1') ]).toBeRdfIsomorphic([ blank('b', 'o2') ]);
    const missing = '{"subject":"_:b","predicate":"p","object":"o2","graph":""}';
    const additional = '{"subject":"_:a","predicate":"p","object":"o1","graph":""}';
    expect(check).toThrow(`Missing Blank Node Patterns:\n_:b : [\n  ${missing}\n]`);
    expect(check).toThrow(`Additional Blank Node Patterns:\n_:a : [\n  ${additional}\n]`);
  });

  it('should not fail for isomorphic graphs', () => {
    expect(() => expect([ named('o1') ]).not.toBeRdfIsomorphic([ named('o1') ]))
      .toThrow('expected two graphs not to be isomorphic.');
  });
});
