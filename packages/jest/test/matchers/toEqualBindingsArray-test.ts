import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('toEqualBindingsArray', () => {
  it('should succeed for equal empty bindings', () => {
    return expect([]).toEqualBindingsArray([]);
  });

  it('should succeed for equal non-empty bindings', () => {
    return expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]);
  });

  it('should not succeed for non-equal bindings', () => {
    return expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).not.toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]);
  });

  it('should not succeed for non-equal bindings due to different length', () => {
    return expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).not.toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
    ]);
  });

  it('should not fail for equal empty bindings', () => {
    return expect(() => expect([]).not.toEqualBindingsArray([]))
      .toThrowError(`expected [  ] not to equal [  ]`);
  });

  it('should not fail for equal non-empty bindings', () => {
    return expect(() => expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).not.toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]))
      .toThrowError(`expected [ {
  "a": "a1",
  "b": "b1"
}, {
  "b": "b1",
  "c": "c1"
} ] not to equal [ {
  "a": "a1",
  "b": "b1"
}, {
  "b": "b1",
  "c": "c1"
} ]`);
  });

  it('should fail for non-equal non-empty bindings', () => {
    return expect(() => expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a2') ],
        [ DF.variable('b'), DF.namedNode('b2') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]))
      .toThrowError(`expected [ {
  "a": "a1",
  "b": "b1"
}, {
  "b": "b1",
  "c": "c1"
} ] to equal [ {
  "a": "a2",
  "b": "b2"
}, {
  "b": "b2",
  "c": "c1"
} ]
Index 0 is different.`);
  });

  it('should fail for non-equal non-empty bindings due to different length', () => {
    return expect(() => expect([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
      ]),
      BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]),
    ]).toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.namedNode('a2') ],
        [ DF.variable('b'), DF.namedNode('b2') ],
      ]),
    ]))
      .toThrowError(`expected [ {
  "a": "a1",
  "b": "b1"
}, {
  "b": "b1",
  "c": "c1"
} ] to equal [ {
  "a": "a2",
  "b": "b2"
} ]`);
  });
});
