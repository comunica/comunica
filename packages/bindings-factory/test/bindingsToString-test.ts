import { DataFactory } from 'rdf-data-factory';
import { bindingsToString } from '../lib';
import { BindingsFactory } from '../lib/BindingsFactory';

const DF = new DataFactory();

describe('bindingsToString', () => {
  it('should stringify empty bindings', () => {
    expect(bindingsToString(new BindingsFactory(DF, {}).bindings([]))).toBe(`{}`);
  });

  it('should stringify non-empty bindings', () => {
    expect(bindingsToString(new BindingsFactory(DF, {}).bindings([
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
    expect(bindingsToString(new BindingsFactory(DF).bindings([
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
