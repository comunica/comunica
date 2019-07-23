import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {getDataSourceType, getDataSourceValue} from "../lib/ActorRdfResolveQuadPattern";
import {ActorRdfResolveQuadPatternSource} from "../lib/ActorRdfResolveQuadPatternSource";

const arrayifyStream = require("arrayify-stream");

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
      match: () => new ArrayIterator(['a', 'b']),
    });

    describe('getContextSourceUrl', () => {
      it('should return null when no source is available', () => {
        return expect(actor.getContextSourceUrl(null)).toEqual(null);
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
      return actor.run({ pattern: {} }).then(async (output) => {
        expect(await arrayifyStream(output.data)).toEqual(['a', 'b']);
      });
    });

    it('should run lazy', () => {
      actor.getSource = () => ({
        matchLazy: () => new ArrayIterator(['al', 'bl']),
      });
      return actor.run({ pattern: {} }).then(async (output) => {
        expect(await arrayifyStream(output.data)).toEqual(['al', 'bl']);
      });
    });
  });

  describe('getDataSourceType', () => {
    it('should return on a string source', () => {
      return expect(getDataSourceType('abc')).toEqual('');
    });

    it('should return on an object source', () => {
      return expect(getDataSourceType({ type: 'T', value: 'abc' })).toEqual('T');
    });
  });

  describe('getDataSourceValue', () => {
    it('should return on a string source', () => {
      return expect(getDataSourceValue('abc')).toEqual('abc');
    });

    it('should return on an object source', () => {
      return expect(getDataSourceValue({ type: 'T', value: 'abc' })).toEqual('abc');
    });
  });
});
