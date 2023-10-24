import { SetUnionContext } from '@comunica/actor-merge-binding-factory-context-union';
import { ActionContext, ActionContextKey } from '@comunica/core';
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
  it('Should set context when key is not in context and context exists', () => {
    bindings = bindings.setContextEntry(new ActionContextKey('testEntry'), true);
    expect(bindings.context).toBeDefined();
    expect(bindings.context).toEqual(new ActionContext({ source: [ 'ex:S1', 'ex:S2', 'ex:S3' ], testEntry: true }));
  });

  it('Should create context with new entry if context does not exist ', () => {
    bindingsNoContext = bindingsNoContext.setContextEntry(new ActionContextKey('testEntry'), true);
    expect(bindingsNoContext.context).toBeDefined();
    expect(bindingsNoContext.context).toEqual(new ActionContext({ testEntry: true }));
  });

  it('Should override context entry when setting existing entry', () => {
    bindings = bindings.setContextEntry(new ActionContextKey('source'), [ 'ex:S1O', 'ex:S2O' ]);
    expect(bindings.context).toBeDefined();
    expect(bindings.context).toEqual(new ActionContext({ source: [ 'ex:S1O', 'ex:S2O' ]}));
  });

  it('Should return correct value', () => {
    const source = bindings.getContextEntry(new ActionContextKey('source'));
    expect(source).toBeDefined();
    expect(source).toEqual([ 'ex:S1', 'ex:S2', 'ex:S3' ]);
  });

  it('Should return undefined when not present', () => {
    const source = bindings.getContextEntry(new ActionContextKey('notPresent'));
    expect(source).toBeUndefined();
  });

  it('Should return undefined when there is no context', () => {
    const source = bindingsNoContext.getContextEntry(new ActionContextKey('source'));
    expect(source).toBeUndefined();
  });

  it('Should delete appropriate context key', () => {
    bindings = bindings.deleteContextEntry(new ActionContextKey('source'));
    expect(bindings.context).toBeDefined();
    expect(bindings.context).toEqual(new ActionContext());
  });

  it('Should work on undefined context', () => {
    bindingsNoContext = bindingsNoContext.deleteContextEntry(new ActionContextKey('source'));
    expect(bindingsNoContext.context).toBeUndefined();
  });
});
