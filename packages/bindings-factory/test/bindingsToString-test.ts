import { DataFactory } from 'rdf-data-factory';
import { bindingsToCompactString, bindingsToString } from '../lib';
import { BindingsFactory } from '../lib/BindingsFactory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF, {});

describe('bindingsToString', () => {
  it('should stringify empty bindings', () => {
    expect(bindingsToString(BF.bindings([]))).toBe(`{}`);
  });

  it('should stringify non-empty bindings', () => {
    expect(bindingsToString(BF.bindings([
      [ DF.variable('a'), DF.namedNode('ex:a') ],
      [ DF.variable('b'), DF.namedNode('ex:b') ],
      [ DF.variable('c'), DF.namedNode('ex:c') ],
    ]))).toBe(`{
  "a": "ex:a",
  "b": "ex:b",
  "c": "ex:c"
}`);
  });

  it('should stringify non-empty bindings consistently', () => {
    expect(bindingsToString(BF.bindings([
      [ DF.variable('c'), DF.namedNode('ex:c') ],
      [ DF.variable('a'), DF.namedNode('ex:a') ],
      [ DF.variable('b'), DF.namedNode('ex:b') ],
    ]))).toBe(`{
  "c": "ex:c",
  "a": "ex:a",
  "b": "ex:b"
}`);
  });
});

describe('bindingsToCompactString', () => {
  it('should hash to concatenation of values of variables', () => {
    expect(bindingsToCompactString(
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
        [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
      ]),
      [ DF.variable('x'), DF.variable('y') ],
    )).toBe('http://www.example.org/instance#a"XYZ"^^ex:abc');
  });

  it('should not let hash being influenced by a variable that is not present in bindings', () => {
    expect(bindingsToCompactString(
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('http://www.example.org/instance#a') ],
        [ DF.variable('y'), DF.literal('XYZ', DF.namedNode('ex:abc')) ],
      ]),
      [ DF.variable('x'), DF.variable('y'), DF.variable('z') ],
    )).toBe('http://www.example.org/instance#a"XYZ"^^ex:abc');
  });
});
