import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
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
