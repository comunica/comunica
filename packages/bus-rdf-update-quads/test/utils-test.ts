import { ActionContext } from '@comunica/core';
import {
  getDataDestinationType,
  getDataDestinationValue,
  getDataDestinationContext,
  isDataDestinationRawType,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

describe('utils', () => {
  const rdfjsStore: RDF.Store = <any> { remove: true };

  describe('isDataDestinationRawType', () => {
    it('should return on a string source', () => {
      expect(isDataDestinationRawType('abc')).toBe(true);
    });

    it('should return on an rdfjs source', () => {
      expect(isDataDestinationRawType(rdfjsStore)).toBe(true);
    });

    it('should return on an object source', () => {
      expect(isDataDestinationRawType({ type: 'T', value: 'abc' })).toBe(false);
    });
  });

  describe('getDataDestinationType', () => {
    it('should return on a string source', () => {
      expect(getDataDestinationType('abc')).toBe('');
    });

    it('should return on an rdfjs source', () => {
      expect(getDataDestinationType(rdfjsStore)).toBe('rdfjsStore');
    });

    it('should return on an object source', () => {
      expect(getDataDestinationType({ type: 'T', value: 'abc' })).toBe('T');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      expect(getDataDestinationType({ value: rdfjsStore })).toBeUndefined();
    });

    it('should return on an object source with explicit rdfjs source', () => {
      expect(getDataDestinationType({ type: 'rdfjsStore', value: rdfjsStore }))
        .toBe('rdfjsStore');
    });
  });

  describe('getDataDestinationValue', () => {
    it('should return on a string source', () => {
      expect(getDataDestinationValue('abc')).toBe('abc');
    });

    it('should return on a rdfjs source source', () => {
      expect(getDataDestinationValue(rdfjsStore)).toEqual(rdfjsStore);
    });

    it('should return on an object source', () => {
      expect(getDataDestinationValue({ type: 'T', value: 'abc' })).toBe('abc');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      expect(getDataDestinationValue({ value: rdfjsStore })).toEqual(rdfjsStore);
    });

    it('should return on an object source with explicit rdfjs source', () => {
      expect(getDataDestinationValue({ type: 'rdfjsStore', value: rdfjsStore }))
        .toEqual(rdfjsStore);
    });
  });

  describe('getDataDestinationContext', () => {
    const context = new ActionContext({ key: 'value' });

    it('should return on a string source', () => {
      expect(getDataDestinationContext('abc', context)).toEqual(context);
    });

    it('should return on a rdfjs source source', () => {
      expect(getDataDestinationContext(rdfjsStore, context)).toEqual(context);
    });

    it('should return on an object source', () => {
      const sourceContext = new ActionContext({ auth: 'username:passwd' });
      expect(getDataDestinationContext({ value: 'http://google.com', context: sourceContext }, context))
        .toEqual(context.merge(sourceContext));
    });
  });
});
