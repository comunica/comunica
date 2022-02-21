import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Bindings } from '../lib/Bindings';
import { BindingsFactory } from '../lib/BindingsFactory';

const DF = new DataFactory();

describe('BindingsFactory', () => {
  let factory: RDF.BindingsFactory;

  beforeEach(() => {
    factory = new BindingsFactory(DF);
  });

  it('should allow construction without args', () => {
    factory = new BindingsFactory();
    expect((<any> factory).dataFactory).toBeInstanceOf(DataFactory);
  });

  describe('bindings', () => {
    it('should create an empty Bindings', () => {
      const bindings = factory.bindings();
      expect(bindings).toBeInstanceOf(Bindings);

      expect(bindings.size).toBe(0);
    });

    it('should create a Bindings object', () => {
      const bindings = factory.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
        [ DF.variable('c'), DF.namedNode('ex:c') ],
      ]);
      expect(bindings).toBeInstanceOf(Bindings);

      expect(bindings.size).toBe(3);
      expect(bindings.has(DF.variable('a'))).toBeTruthy();
      expect(bindings.has(DF.variable('b'))).toBeTruthy();
      expect(bindings.has(DF.variable('c'))).toBeTruthy();
      expect(bindings.has(DF.variable('d'))).toBeFalsy();
    });
  });

  describe('fromBindings', () => {
    it('should create a Bindings object', () => {
      const bindingsIn = factory.bindings([
        [ DF.variable('a'), DF.namedNode('ex:a') ],
        [ DF.variable('b'), DF.namedNode('ex:b') ],
        [ DF.variable('c'), DF.namedNode('ex:c') ],
      ]);
      const bindings = factory.fromBindings(bindingsIn);
      expect(bindings).toBeInstanceOf(Bindings);
      expect(bindings).not.toBe(bindingsIn);

      expect(bindings.has(DF.variable('a'))).toBeTruthy();
      expect(bindings.has(DF.variable('b'))).toBeTruthy();
      expect(bindings.has(DF.variable('c'))).toBeTruthy();
      expect(bindings.has(DF.variable('d'))).toBeFalsy();
    });
  });

  describe('fromRecord', () => {
    it('should create a Bindings object', () => {
      const bindings = (<BindingsFactory> factory).fromRecord({
        a: DF.namedNode('ex:a'),
        b: DF.namedNode('ex:b'),
        c: DF.namedNode('ex:c'),
      });
      expect(bindings).toBeInstanceOf(Bindings);

      expect(bindings.has(DF.variable('a'))).toBeTruthy();
      expect(bindings.has(DF.variable('b'))).toBeTruthy();
      expect(bindings.has(DF.variable('c'))).toBeTruthy();
      expect(bindings.has(DF.variable('d'))).toBeFalsy();
    });
  });
});
