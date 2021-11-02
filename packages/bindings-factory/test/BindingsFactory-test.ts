/* eslint-disable mocha/max-top-level-suites */
import { Map } from 'immutable';
import { DataFactory } from 'rdf-data-factory';
import { BindingsFactory } from '../lib/BindingsFactory';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('Bindings', () => {
  it('should create a map', () => {
    expect(BF.bindings({ a: DF.namedNode('b') })).toBeInstanceOf(Map);
  });
});

describe('isBindings', () => {
  it('should be true for bindings', () => {
    expect(BF.isBindings(BF.bindings({}))).toBeTruthy();
  });

  it('should be false for other objects', () => {
    expect(BF.isBindings({})).toBeFalsy();
  });
});

describe('ensureBindings', () => {
  it('should not change things that are already bindings', () => {
    const b = BF.bindings({});
    expect(BF.ensureBindings(b)).toBe(b);
  });

  it('should create bindings from hashes', () => {
    expect(BF.ensureBindings({})).toBeInstanceOf(Map);
    expect(BF.ensureBindings({ a: DF.namedNode('b') }).get('a')).toEqual(DF.namedNode('b'));
  });
});
