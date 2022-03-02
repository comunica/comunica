import { ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { getDataDestinationType, getDataDestinationValue,
  getDataDestinationContext, isDataDestinationRawType } from '..';

describe('utils', () => {
  const rdfjsStore: RDF.Store = <any> { remove: true };

  describe('isDataDestinationRawType', () => {
    it('should return on a string source', () => {
      return expect(isDataDestinationRawType('abc')).toEqual(true);
    });

    it('should return on an rdfjs source', () => {
      return expect(isDataDestinationRawType(rdfjsStore)).toEqual(true);
    });

    it('should return on an object source', () => {
      return expect(isDataDestinationRawType({ type: 'T', value: 'abc' })).toEqual(false);
    });
  });

  describe('getDataDestinationType', () => {
    it('should return on a string source', () => {
      return expect(getDataDestinationType('abc')).toEqual('');
    });

    it('should return on an rdfjs source', () => {
      return expect(getDataDestinationType(rdfjsStore)).toEqual('rdfjsStore');
    });

    it('should return on an object source', () => {
      return expect(getDataDestinationType({ type: 'T', value: 'abc' })).toEqual('T');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      return expect(getDataDestinationType({ value: rdfjsStore })).toEqual(undefined);
    });

    it('should return on an object source with explicit rdfjs source', () => {
      return expect(getDataDestinationType({ type: 'rdfjsStore', value: rdfjsStore }))
        .toEqual('rdfjsStore');
    });
  });

  describe('getDataDestinationValue', () => {
    it('should return on a string source', () => {
      return expect(getDataDestinationValue('abc')).toEqual('abc');
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataDestinationValue(rdfjsStore)).toEqual(rdfjsStore);
    });

    it('should return on an object source', () => {
      return expect(getDataDestinationValue({ type: 'T', value: 'abc' })).toEqual('abc');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      return expect(getDataDestinationValue({ value: rdfjsStore })).toEqual(rdfjsStore);
    });

    it('should return on an object source with explicit rdfjs source', () => {
      return expect(getDataDestinationValue({ type: 'rdfjsStore', value: rdfjsStore }))
        .toEqual(rdfjsStore);
    });
  });

  describe('getDataDestinationContext', () => {
    const context = new ActionContext({ key: 'value' });

    it('should return on a string source', () => {
      return expect(getDataDestinationContext('abc', context)).toEqual(context);
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataDestinationContext(rdfjsStore, context)).toEqual(context);
    });

    it('should return on an object source', () => {
      const sourceContext = new ActionContext({ auth: 'username:passwd' });
      return expect(getDataDestinationContext({ value: 'http://google.com', context: sourceContext }, context))
        .toEqual(context.merge(sourceContext));
    });
  });
});
