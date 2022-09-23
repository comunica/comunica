import { Bus } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfResolveQuadPatternSource, getContextSourceUrl } from '..';

describe('ActorRdfResolveQuadPatternSource', () => {
  const bus = new Bus({ name: 'bus' });

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
        // eslint-disable-next-line unicorn/no-useless-undefined
        return expect(getContextSourceUrl(undefined)).toEqual(undefined);
      });

      it('should return when a source is available', () => {
        return expect(getContextSourceUrl({ value: 'abc' })).toEqual('abc');
      });

      it('should return undefined when a source is available with an object value', () => {
        const src = {};
        return expect(getContextSourceUrl({ value: <any> src })).toBeUndefined();
      });

      it('should return when a source is available and is a string', () => {
        return expect(getContextSourceUrl('abc')).toEqual('abc');
      });

      it('should strip away everything after the hash', () => {
        return expect(getContextSourceUrl({ value: 'http://ex.org/#abcdef#xyz' })).toEqual('http://ex.org/');
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
});
