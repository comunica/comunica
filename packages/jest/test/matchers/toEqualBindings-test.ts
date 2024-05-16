import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('toEqualBindings', () => {
  it('should succeed for equal empty bindings', () => {
    expect(BF.bindings()).toEqualBindings(BF.bindings());
  });

  it('should succeed for equal non-empty bindings', () => {
    expect(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ])).toEqualBindings(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ]));
  });

  it('should not succeed for non-equal bindings', () => {
    expect(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ])).not.toEqualBindings(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a2') ],
      [ DF.variable('b'), DF.namedNode('b2') ],
    ]));
  });

  it('should not fail for equal empty bindings', () => {
    expect(() => expect(BF.bindings()).not.toEqualBindings(BF.bindings()))
      .toThrow(`expected {} and {} not to be equal`);
  });

  it('should not fail for equal non-empty bindings', () => {
    expect(() => expect(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ])).not.toEqualBindings(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ])))
      .toThrow(`expected {
  "a": "a1",
  "b": "b1"
} and {
  "a": "a1",
  "b": "b1"
} not to be equal`);
  });

  it('should fail for non-equal non-empty bindings', () => {
    expect(() => expect(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a1') ],
      [ DF.variable('b'), DF.namedNode('b1') ],
    ])).toEqualBindings(BF.bindings([
      [ DF.variable('a'), DF.namedNode('a2') ],
      [ DF.variable('b'), DF.namedNode('b2') ],
    ])))
      .toThrow(`expected {
  "a": "a1",
  "b": "b1"
} and {
  "a": "a2",
  "b": "b2"
} to be equal`);
  });
});
