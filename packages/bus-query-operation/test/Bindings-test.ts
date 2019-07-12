import {namedNode} from "@rdfjs/data-model";
import {Map} from "immutable";
import {Bindings, ensureBindings, isBindings} from "..";

describe('Bindings', () => {
  it('should create a map', () => {
    expect(Bindings({ a: namedNode('b') })).toBeInstanceOf(Map);
  });
});

describe('isBindings', () => {
  it('should be true for bindings', () => {
    expect(isBindings(Bindings({}))).toBeTruthy();
  });

  it('should be false for other objects', () => {
    expect(isBindings({})).toBeFalsy();
  });
});

describe('ensureBindings', () => {
  it('should not change things that are already bindings', () => {
    const b = Bindings({});
    expect(ensureBindings(b)).toBe(b);
  });

  it('should create bindings from hashes', () => {
    expect(ensureBindings({})).toBeInstanceOf(Map);
    expect(ensureBindings({ a: namedNode('b') }).get('a')).toEqual(namedNode('b'));
  });
});
