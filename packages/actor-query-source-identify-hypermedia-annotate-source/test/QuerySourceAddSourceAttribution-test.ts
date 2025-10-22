import { KeysMergeBindingsContext } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IQuerySource } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { Bindings } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceAddSourceAttribution } from '../lib/QuerySourceAddSourceAttribution';
import '@comunica/utils-jest';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory();

describe('QuerySourcAddSourceAttribution', () => {
  let sourceInner: IQuerySource;
  let source: QuerySourceAddSourceAttribution;

  beforeEach(() => {
    sourceInner = {
      getFilterFactor: <any> jest.fn(async() => 1),
      getSelectorShape: <any> jest.fn(async() => 'SHAPE'),
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
    source = new QuerySourceAddSourceAttribution(sourceInner);
  });

  it('should delegate getFilterFactor', async() => {
    const context = new ActionContext();
    await expect(source.getFilterFactor(context)).resolves.toBe(1);
    expect(sourceInner.getFilterFactor).toHaveBeenCalledWith(context);
  });

  it('should delegate getSelectorShape', async() => {
    const context = new ActionContext();
    await expect(source.getSelectorShape(context)).resolves.toBe('SHAPE');
    expect(sourceInner.getSelectorShape).toHaveBeenCalledWith(context);
  });

  it('should delegate queryBindings', async() => {
    const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
    const context = new ActionContext();
    const opts: any = {};
    await expect(source.queryBindings(op, context, opts)).toEqualBindingsStream([
      BF.fromRecord({ a: DF.namedNode('a0') }),
      BF.fromRecord({ a: DF.blankNode('a1') }),
      BF.fromRecord({ a: DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.blankNode('a2'),
      ) }),
    ]);
    expect(sourceInner.queryBindings).toHaveBeenCalledWith(op, context, opts);
  });

  it('should add source to bindings', async() => {
    const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
    const context = new ActionContext();
    const opts: any = {};
    const sourceAttributionBindingsStream = source.queryBindings(op, context, opts);
    const producedBindings = await sourceAttributionBindingsStream.toArray();
    const bindingSources = producedBindings.map(x => (<Bindings> x)
      .getContextEntry(KeysMergeBindingsContext.sourcesBinding));
    expect(bindingSources).toEqual([[ 'REF' ], [ 'REF' ], [ 'REF' ]]);
  });

  it('should not add source to unsupported bindings', async() => {
    sourceInner.queryBindings = <any> jest.fn(() => {
      const it = new ArrayIterator([
        { a: DF.namedNode('a0') },
        { a: DF.blankNode('a1') },
        { a: DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.blankNode('a2')) },
      ], { autoStart: false });
      it.setProperty('metadata', { state: new MetadataValidationState() });
      return it;
    });
    const op = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'));
    const context = new ActionContext();
    const opts: any = {};
    const sourceAttributionBindingsStream = source.queryBindings(op, context, opts);
    await expect(sourceAttributionBindingsStream.toArray()).resolves.toHaveLength(3);
  });

  it('should delegate queryBoolean', async() => {
    const op: any = {};
    const context = new ActionContext();
    await expect(source.queryBoolean(op, context)).resolves.toBe(true);
    expect(sourceInner.queryBoolean).toHaveBeenCalledWith(op, context);
  });

  it('should delegate queryQuads', async() => {
    const op = AF.createConstruct(
      AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
      [],
    );

    const context = new ActionContext();
    await expect(source.queryQuads(op, context).toArray()).resolves.toEqual([
      DF.quad(
        DF.namedNode('s1'),
        DF.namedNode('p1'),
        DF.blankNode('o1'),
      ),
      DF.quad(
        DF.namedNode('s2'),
        DF.namedNode('p2'),
        DF.blankNode('o2'),
      ),
    ]);
    expect(sourceInner.queryQuads).toHaveBeenCalledWith(op, context);
  });

  it('should delegate queryVoid', async() => {
    const op: any = {};
    const context = new ActionContext();
    await source.queryVoid(op, context);
    expect(sourceInner.queryVoid).toHaveBeenCalledWith(op, context);
  });

  it('should delegate referenceValue', async() => {
    expect(source.referenceValue).toBe('REF');
  });

  it('should delegate toString', async() => {
    expect(source.toString()).toBe(`STR`);
    expect(sourceInner.toString).toHaveBeenCalledTimes(1);
  });
});
