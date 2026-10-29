import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();

function quad(object: string): ReturnType<DataFactory['quad']> {
  return DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode(object));
}

describe('toEqualRdfQuadArray', () => {
  it('should succeed for equal empty arrays', () => {
    expect([]).toEqualRdfQuadArray([]);
  });

  it('should succeed for equal arrays', () => {
    expect([ quad('o1'), quad('o2') ]).toEqualRdfQuadArray([ quad('o1'), quad('o2') ]);
  });

  it('should not succeed for arrays of a different length', () => {
    expect([ quad('o1') ]).not.toEqualRdfQuadArray([ quad('o1'), quad('o2') ]);
  });

  it('should not succeed for arrays with a different quad', () => {
    expect([ quad('o1'), quad('o2') ]).not.toEqualRdfQuadArray([ quad('o1'), quad('o3') ]);
  });

  it('should fail for arrays of a different length', () => {
    expect(() => expect([ quad('o1') ]).toEqualRdfQuadArray([ quad('o1'), quad('o2') ]))
      .toThrow('to equal');
  });

  it('should fail for arrays with a different quad', () => {
    expect(() => expect([ quad('o1'), quad('o2') ]).toEqualRdfQuadArray([ quad('o1'), quad('o3') ]))
      .toThrow('expected o2 and o3 to be equal');
  });

  it('should not fail for equal arrays', () => {
    expect(() => expect([ quad('o1') ]).not.toEqualRdfQuadArray([ quad('o1') ]))
      .toThrow('not to equal');
  });
});
