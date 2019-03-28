import {ActionContext, Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {KEY_CONTEXT_SOURCE} from "../lib/ActorRdfResolveQuadPattern";
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
        return expect(actor.getContextSourceUrl(ActionContext({}))).toEqual(null);
      });

      it('should return when a source is available', () => {
        const context = ActionContext({ [KEY_CONTEXT_SOURCE]: { value: 'abc' } });
        return expect(actor.getContextSourceUrl(context)).toEqual('abc');
      });

      it('should strip away everything after the hash', () => {
        const context = ActionContext({ [KEY_CONTEXT_SOURCE]: { value: 'http://ex.org/#abcdef#xyz' } });
        return expect(actor.getContextSourceUrl(context)).toEqual('http://ex.org/');
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
});
