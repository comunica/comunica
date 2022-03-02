import { DataFactory } from 'rdf-data-factory';
import { bindingsToString } from '../lib';
import { BindingsFactory } from '../lib/BindingsFactory';

const DF = new DataFactory();

describe('bindingsToString', () => {
  it('should stringify empty bindings', () => {
    expect(bindingsToString(new BindingsFactory().bindings([]))).toEqual(`{}`);
  });

  it('should stringify non-empty bindings', () => {
    expect(bindingsToString(new BindingsFactory().bindings([
      [ DF.variable('a'), DF.namedNode('ex:a') ],
      [ DF.variable('b'), DF.namedNode('ex:b') ],
      [ DF.variable('c'), DF.namedNode('ex:c') ],
    ]))).toEqual(`{
  "a": "ex:a",
  "b": "ex:b",
  "c": "ex:c"
}`);
  });
});
