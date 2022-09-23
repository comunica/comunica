import { ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { getDataSourceType, getDataSourceValue,
  getDataSourceContext, isDataSourceRawType, getContextSourceFirst } from '..';

describe('utils', () => {
  const rdfjsSource: RDF.Source = <any> { match: true };

  describe('isDataSourceRawType', () => {
    it('should return on a string source', () => {
      return expect(isDataSourceRawType('abc')).toEqual(true);
    });

    it('should return on an rdfjs source', () => {
      return expect(isDataSourceRawType(rdfjsSource)).toEqual(true);
    });

    it('should return on an object source', () => {
      return expect(isDataSourceRawType({ type: 'T', value: 'abc' })).toEqual(false);
    });
  });

  describe('getDataSourceType', () => {
    it('should return on a string source', () => {
      return expect(getDataSourceType('abc')).toEqual('');
    });

    it('should return on an rdfjs source', () => {
      return expect(getDataSourceType(rdfjsSource)).toEqual('rdfjsSource');
    });

    it('should return on an object source', () => {
      return expect(getDataSourceType({ type: 'T', value: 'abc' })).toEqual('T');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      return expect(getDataSourceType({ value: rdfjsSource })).toEqual(undefined);
    });

    it('should return on an object source with explicit rdfjs source', () => {
      return expect(getDataSourceType({ type: 'rdfjsSource', value: rdfjsSource })).toEqual('rdfjsSource');
    });
  });

  describe('getDataSourceValue', () => {
    it('should return on a string source', () => {
      return expect(getDataSourceValue('abc')).toEqual('abc');
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataSourceValue(rdfjsSource)).toEqual(rdfjsSource);
    });

    it('should return on an object source', () => {
      return expect(getDataSourceValue({ type: 'T', value: 'abc' })).toEqual('abc');
    });

    it('should return on an object source with implicit rdfjs source', () => {
      return expect(getDataSourceValue({ value: rdfjsSource })).toEqual(rdfjsSource);
    });

    it('should return on an object source with explicit rdfjs source', () => {
      return expect(getDataSourceValue({ type: 'rdfjsSource', value: rdfjsSource })).toEqual(rdfjsSource);
    });
  });

  describe('getDataSourceContext', () => {
    const context = new ActionContext({ key: 'value' });

    it('should return on a string source', () => {
      return expect(getDataSourceContext('abc', context)).toEqual(context);
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataSourceContext(rdfjsSource, context)).toEqual(context);
    });

    it('should return on an object source', () => {
      const sourceContext = new ActionContext({ auth: 'username:passwd' });
      return expect(getDataSourceContext({ value: 'http://google.com', context: sourceContext }, context))
        .toEqual(context.merge(sourceContext));
    });
  });

  describe('#getSingleSource', () => {
    it('should extract single source when source is set', () => {
      const source = getContextSourceFirst(new ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'a-type', value: 'a-value' }},
      ));
      return expect(source).toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return the first source when one sources is defined in the list of sources', () => {
      const source = getContextSourceFirst(new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources': [
          { type: 'a-type', value: 'a-value' },
        ],
      }));
      return expect(source).toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return undefined when multiple sources are defined in the list of sources', () => {
      const source = getContextSourceFirst(new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources': [
          { type: 'a-type', value: 'a-value' },
          { type: 'a-type', value: 'a-value' },
        ],
      }));
      return expect(source).toEqual(undefined);
    });

    it('return undefined for sources that are not ended', () => {
      const source = getContextSourceFirst(new ActionContext({
        '@comunica/bus-rdf-resolve-quad-pattern:sources': [],
      }));
      return expect(source).toEqual(undefined);
    });
  });
});
