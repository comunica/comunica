import { SetUnionContext } from '@comunica/actor-merge-binding-factory-context-union';
import { ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import { Bindings } from '../lib/Bindings';
import 'jest-rdf';

const DF = new DataFactory();

describe('Binding context mergehandler', () => {
  let bindings: Bindings;

  beforeEach(() => {
    bindings = new Bindings(DF, Map<string, RDF.Term>([
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
      [ 'c', DF.namedNode('ex:c') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
  });

  it('should merge binding context according to mergehandler in mergeWith', () => {
    const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
      [ 'd', DF.namedNode('ex:d') ],
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ]}));
    const bindingsNew: Bindings = bindings.merge(bindingsOther)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
  });

  it('should merge own binding context with extra key by adding to result context without change', () => {
    const bindingsExtraKey = new Bindings(DF, Map<string, RDF.Term>([
      [ 'd', DF.namedNode('ex:d') ],
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
      extraKey: [ 'ex:T1', 'ex:T2' ]}));
    const bindingsNew: Bindings = bindingsExtraKey.merge(bindings)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5', 'ex:S3' ],
      extraKey: [ 'ex:T1', 'ex:T2' ]}));
  });

  it('should merge other binding context with extra key by adding to result context without change', () => {
    const bindingsExtraKey = new Bindings(DF, Map<string, RDF.Term>([
      [ 'd', DF.namedNode('ex:d') ],
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ],
      extraKey: [ 'ex:T1', 'ex:T2' ]}));
    const bindingsNew: Bindings = bindings.merge(bindingsExtraKey)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ],
      extraKey: [ 'ex:T1', 'ex:T2' ]}));
  });

  it('should merge remove all binding context entries that occur in both contexts but dont have a mergehandler', () => {
    const bindingsNoMergeHandler = new Bindings(DF, Map<string, RDF.Term>([
      [ 'd', DF.namedNode('ex:d') ],
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
    ]), {}, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ]}));
    const bindingsNew: Bindings = bindingsNoMergeHandler.merge(bindings)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({}));
  });

  it('should merge overlapping compatible bindings', () => {
    const bindingsOther = new Bindings(DF, Map<string, RDF.Term>([
      [ 'd', DF.namedNode('ex:d') ],
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ]}));

    const cb = jest.fn();
    const bindingsNew: Bindings = bindings.mergeWith(cb, bindingsOther);
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
  });
});
