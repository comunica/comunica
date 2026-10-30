import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IQuerySource } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { BlankNodeScoped } from '@comunica/utils-data-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceSkolemized } from '../lib/QuerySourceSkolemized';
import '@comunica/utils-jest';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

describe('QuerySourceSkolemized', () => {
  let sourceInner: IQuerySource;
  let source: QuerySourceSkolemized;

  beforeEach(() => {
    sourceInner = {
      getFilterFactor: <any> jest.fn(() => 1),
      getSelectorShape: <any> jest.fn(() => 'SHAPE'),
      queryBindings: <any> jest.fn(() => {
        const it = new ArrayIterator([
          BF.fromRecord({ a: DF.namedNode('a0') }),
          BF.fromRecord({ a: DF.blankNode('a1') }),
          BF.fromRecord({ a: DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.blankNode('a2')) }),
        ], { autoStart: false });
        it.setProperty('metadata', { state: new MetadataValidationState() });
        return it;
      }),
      queryBoolean: <any> jest.fn(async() => true),
      queryQuads: <any> jest.fn(() => {
        const it = new ArrayIterator([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.blankNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.blankNode('o2')),
        ], { autoStart: false });
        it.setProperty('metadata', { state: new MetadataValidationState() });
        return it;
      }),
      queryVoid: <any> jest.fn(),
      toString: <any> jest.fn(() => 'STR'),
      referenceValue: 'REF',
    };
    source = new QuerySourceSkolemized(sourceInner, '0');
  });

  it('should delegate getFilterFactor', async() => {
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await expect(source.getFilterFactor(context)).resolves.toBe(1);
    expect(sourceInner.getFilterFactor).toHaveBeenCalledWith(context);
  });

  it('should delegate getSelectorShape', async() => {
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await expect(source.getSelectorShape(context)).resolves.toBe('SHAPE');
    expect(sourceInner.getSelectorShape).toHaveBeenCalledWith(context);
  });

  it('should delegate queryBindings', async() => {
    const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const opts: any = {};
    await expect(source.queryBindings(op, context, opts)).toEqualBindingsStream([
      BF.fromRecord({ a: DF.namedNode('a0') }),
      BF.fromRecord({ a: new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')) }),
      BF.fromRecord({ a: DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a2', DF.namedNode('urn:comunica_skolem:source_0:a2')),
      ) }),
    ]);
    expect(sourceInner.queryBindings).toHaveBeenCalledWith(op, context, opts);
  });

  it('should delegate queryBindings with in-scope pattern', async() => {
    const op = AF.createPattern(
      DF.namedNode('s'),
      DF.namedNode('p'),
      new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')),
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const opts: any = {};
    await expect(source.queryBindings(op, context, opts)).toEqualBindingsStream([
      BF.fromRecord({ a: DF.namedNode('a0') }),
      BF.fromRecord({ a: new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')) }),
      BF.fromRecord({ a: DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a2', DF.namedNode('urn:comunica_skolem:source_0:a2')),
      ) }),
    ]);
    expect(sourceInner.queryBindings).toHaveBeenCalledWith(AF.createPattern(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.blankNode('a1'),
    ), context, opts);
  });

  it('should delegate queryBindings with in-scope path', async() => {
    const op = AF.createPath(
      DF.namedNode('s'),
      AF.createNps([]),
      new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')),
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const opts: any = {};
    await expect(source.queryBindings(op, context, opts)).toEqualBindingsStream([
      BF.fromRecord({ a: DF.namedNode('a0') }),
      BF.fromRecord({ a: new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')) }),
      BF.fromRecord({ a: DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a2', DF.namedNode('urn:comunica_skolem:source_0:a2')),
      ) }),
    ]);
    expect(sourceInner.queryBindings).toHaveBeenCalledWith(AF.createPath(
      DF.namedNode('s'),
      AF.createNps([]),
      DF.blankNode('a1'),
    ), context, opts);
  });

  it('should delegate queryBindings with non-in-scope pattern', async() => {
    const op = AF.createPattern(
      DF.namedNode('s'),
      DF.namedNode('p'),
      new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_1:a1')),
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const opts: any = {};
    const it = source.queryBindings(op, context, opts);
    await expect(it).toEqualBindingsStream([]);
    await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
      state: expect.any(MetadataValidationState),
      cardinality: { type: 'exact', value: 0 },
      variables: [],
    });
    expect(sourceInner.queryBindings).not.toHaveBeenCalled();
  });

  it('should delegate queryBindings with non-in-scope nested node in pattern', async() => {
    const op = AF.createPattern(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_1:a1')),
      ),
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const opts: any = {};
    const it = source.queryBindings(op, context, opts);
    await expect(it).toEqualBindingsStream([]);
    await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
      state: expect.any(MetadataValidationState),
      cardinality: { type: 'exact', value: 0 },
      variables: [],
    });
    expect(sourceInner.queryBindings).not.toHaveBeenCalled();
  });

  describe('queryBindingsSynchronous', () => {
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const inScope = AF.createPattern(
      DF.namedNode('s'),
      DF.namedNode('p'),
      new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')),
    );

    it('should not handle inner sources without synchronous lookups', () => {
      expect(source.queryBindingsSynchronous(inScope, context)).toBeUndefined();
    });

    it('should not handle inner sources that can not look up the pattern synchronously', () => {
      Object.assign(sourceInner, { queryBindingsSynchronous: jest.fn(() => undefined) });
      expect(source.queryBindingsSynchronous(inScope, context)).toBeUndefined();
    });

    it('should deskolemize the pattern and skolemize the bindings', () => {
      const plain = BF.fromRecord({ a: DF.namedNode('a0') });
      Object.assign(sourceInner, { queryBindingsSynchronous: jest.fn(() => [
        plain,
        BF.fromRecord({ a: DF.blankNode('a1') }),
      ]) });
      const bindings = source.queryBindingsSynchronous(inScope, context)!;
      expect(bindings).toEqualBindingsArray([
        plain,
        BF.fromRecord({ a: new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')) }),
      ]);
      // Bindings without blank nodes are not copied
      expect(bindings[0]).toBe(plain);
      expect(sourceInner.queryBindingsSynchronous).toHaveBeenCalledWith(AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.blankNode('a1'),
      ), context);
    });

    it('should return no bindings for a pattern that is not in scope', () => {
      Object.assign(sourceInner, { queryBindingsSynchronous: jest.fn() });
      expect(source.queryBindingsSynchronous(AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_1:a1')),
      ), context)).toEqual([]);
      expect(sourceInner.queryBindingsSynchronous).not.toHaveBeenCalled();
    });

    it('should deskolemize operations that are not patterns', () => {
      Object.assign(sourceInner, { queryBindingsSynchronous: jest.fn(() => []) });
      expect(source.queryBindingsSynchronous(AF.createJoin([ inScope ]), context)).toEqual([]);
      expect(sourceInner.queryBindingsSynchronous).toHaveBeenCalledWith(AF.createJoin([ AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.blankNode('a1'),
      ) ]), context);
    });
  });

  it('should delegate queryBoolean', async() => {
    const op: any = {};
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await expect(source.queryBoolean(op, context)).resolves.toBe(true);
    expect(sourceInner.queryBoolean).toHaveBeenCalledWith(op, context);
  });

  it('should delegate queryQuads', async() => {
    const op = AF.createConstruct(
      AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      [],
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await expect(source.queryQuads(op, context).toArray()).resolves.toEqual([
      DF.quad(
        DF.namedNode('s1'),
        DF.namedNode('p1'),
        new BlankNodeScoped('bc_0_o1', DF.namedNode('urn:comunica_skolem:source_0:o1')),
      ),
      DF.quad(
        DF.namedNode('s2'),
        DF.namedNode('p2'),
        new BlankNodeScoped('bc_0_o2', DF.namedNode('urn:comunica_skolem:source_0:o2')),
      ),
    ]);
    expect(sourceInner.queryQuads).toHaveBeenCalledWith(op, context);
  });

  it('should delegate queryQuads with in-scope pattern', async() => {
    const op = AF.createConstruct(
      AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_0:a1')),
      ),
      [],
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await expect(source.queryQuads(op, context).toArray()).resolves.toEqual([
      DF.quad(
        DF.namedNode('s1'),
        DF.namedNode('p1'),
        new BlankNodeScoped('bc_0_o1', DF.namedNode('urn:comunica_skolem:source_0:o1')),
      ),
      DF.quad(
        DF.namedNode('s2'),
        DF.namedNode('p2'),
        new BlankNodeScoped('bc_0_o2', DF.namedNode('urn:comunica_skolem:source_0:o2')),
      ),
    ]);
    expect(sourceInner.queryQuads).toHaveBeenCalledWith(AF.createConstruct(
      AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.blankNode('a1'),
      ),
      [],
    ), context);
  });

  it('should delegate queryQuads with non-in-scope pattern', async() => {
    const op = AF.createConstruct(
      AF.createPattern(
        DF.namedNode('s'),
        DF.namedNode('p'),
        new BlankNodeScoped('bc_0_a1', DF.namedNode('urn:comunica_skolem:source_1:a1')),
      ),
      [],
    );
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const it = source.queryQuads(op, context);
    await expect(source.queryQuads(op, context).toArray()).resolves.toEqual([]);
    await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toEqual({
      state: expect.any(MetadataValidationState),
      cardinality: { type: 'exact', value: 0 },
    });
    expect(sourceInner.queryBindings).not.toHaveBeenCalled();
  });

  it('should delegate queryVoid', async() => {
    const op: any = {};
    const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    await source.queryVoid(op, context);
    expect(sourceInner.queryVoid).toHaveBeenCalledWith(op, context);
  });

  it('should delegate referenceValue', async() => {
    expect(source.referenceValue).toBe('REF');
  });

  it('should delegate toString', async() => {
    expect(source.toString()).toBe(`STR(SkolemID:0)`);
    expect(sourceInner.toString).toHaveBeenCalledTimes(1);
  });
});
