import { Bus, ActionContext } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { ActorRdfResolveQuadPatternSource, getDataSourceType, getDataSourceValue,
  getDataSourceContext, isDataSourceRawType } from '..';

const arrayifyStream = require('arrayify-stream');

describe('ActorRdfResolveQuadPatternSource', () => {
  const bus = new Bus({ name: 'bus' });
  const rdfjsSource: RDF.Source = <any> { match: true };

  describe('The ActorRdfResolveQuadPatternSource module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternSource).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternSource constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternSource)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternSource);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternSource objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternSource)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternSource instance', () => {
    const actor = new (<any> ActorRdfResolveQuadPatternSource)({ name: 'actor', bus });
    actor.getSource = () => ({
      match: () => new ArrayIterator([ 'a', 'b' ]),
    });

    describe('getContextSourceUrl', () => {
      it('should return null when no source is available', () => {
        return expect(actor.getContextSourceUrl(null)).toEqual(undefined);
      });

      it('should return when a source is available', () => {
        return expect(actor.getContextSourceUrl({ value: 'abc' })).toEqual('abc');
      });

      it('should strip away everything after the hash', () => {
        return expect(actor.getContextSourceUrl({ value: 'http://ex.org/#abcdef#xyz' })).toEqual('http://ex.org/');
      });
    });

    it('should have a default test implementation', () => {
      return expect(actor.test(null)).resolves.toBeTruthy();
    });

    it('should run', () => {
      return actor.run({ pattern: {}}).then(async(output: any) => {
        expect(await arrayifyStream(output.data)).toEqual([ 'a', 'b' ]);
      });
    });
  });

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
    const context = ActionContext({ key: 'value' });

    it('should return on a string source', () => {
      return expect(getDataSourceContext('abc', context)).toEqual(context);
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataSourceContext(rdfjsSource, context)).toEqual(context);
    });

    it('should return on an object source', () => {
      const sourceContext = ActionContext({ auth: 'username:passwd' });
      return expect(getDataSourceContext({ value: 'http://google.com', context: sourceContext }, context))
        .toEqual(context.merge(sourceContext));
    });
  });
});
