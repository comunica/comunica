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
  let bindingsNoContext: Bindings;

  beforeEach(() => {
    bindings = new Bindings(DF, Map<string, RDF.Term>([
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
      [ 'c', DF.namedNode('ex:c') ],
    ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
    bindingsNoContext = new Bindings(DF, Map<string, RDF.Term>([
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
      [ 'd', DF.namedNode('ex:d') ],
    ]), {});
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
  it('should merge with itself with context', () => {
    const bindingsNew = bindings.merge(bindings)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
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

  it('should merge with only left side merge context', () => {
    const bindingsNew = bindings.merge(bindingsNoContext)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
  });

  it('should merge with only right side merge context', () => {
    const bindingsNew = bindingsNoContext.merge(bindings)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ]}));
  });

  it('should merge with undefined context', () => {
    const bindingsNoContextOther = new Bindings(DF, Map<string, RDF.Term>([
      [ 'a', DF.namedNode('ex:a') ],
      [ 'b', DF.namedNode('ex:b') ],
      [ 'd', DF.namedNode('ex:d') ],
    ]), {});

    const bindingsNew = bindingsNoContext.merge(bindingsNoContextOther)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(undefined);
  });

  it('should merge with itself with no context', () => {
    const bindingsNew = bindingsNoContext.merge(bindingsNoContext)!;
    expect(bindingsNew).toBeDefined();
    expect(bindingsNew.context).toEqual(undefined);
  });

  describe('calling merge twice on same binding should give correct results', () => {
    let bindingsOther1: Bindings;
    let bindingsOther2: Bindings;
    beforeEach(() => {
      bindingsOther1 = new Bindings(DF, Map<string, RDF.Term>([
        [ 'd', DF.namedNode('ex:d') ],
        [ 'a', DF.namedNode('ex:a') ],
        [ 'b', DF.namedNode('ex:b') ],
      ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S5' ]}));
      bindingsOther2 = new Bindings(DF, Map<string, RDF.Term>([
        [ 'd', DF.namedNode('ex:d') ],
        [ 'a', DF.namedNode('ex:a') ],
        [ 'b', DF.namedNode('ex:b') ],
      ]), { source: new SetUnionContext() }, new ActionContext({ source: [ 'ex:S2', 'ex:S9' ]}));
    });

    it('calling merge twice with different bindings should give correct results', () => {
      const bindingsNew1: Bindings = bindings.merge(bindingsOther1)!;
      expect(bindingsNew1).toBeDefined();
      expect(bindingsNew1.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
      const bindingsNew2: Bindings = bindings.merge(bindingsOther2)!;
      expect(bindingsNew2).toBeDefined();
      expect(bindingsNew2.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S9' ]}));
    });

    it('calling mergeWith twice with different bindings should give correct results', () => {
      const cb = jest.fn();
      const bindingsNew1: Bindings = bindings.mergeWith(cb, bindingsOther1)!;
      expect(bindingsNew1).toBeDefined();
      expect(bindingsNew1.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S5' ]}));
      const bindingsNew2: Bindings = bindings.mergeWith(cb, bindingsOther2)!;
      expect(bindingsNew2).toBeDefined();
      expect(bindingsNew2.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3', 'ex:S9' ]}));
    });
  });
});
