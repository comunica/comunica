import { Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { ActorRdfUpdateQuadsDestination, getContextDestinationUrl } from '..';

describe('ActorRdfUpdateQuadsDestination', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorRdfUpdateQuadsDestination module', () => {
    it('should be a function', () => {
      expect(ActorRdfUpdateQuadsDestination).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfUpdateQuadsDestination constructor', () => {
      expect(new (<any> ActorRdfUpdateQuadsDestination)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfUpdateQuadsDestination);
    });

    it('should not be able to create new ActorRdfUpdateQuadsDestination objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfUpdateQuadsDestination)(); }).toThrow();
    });
  });

  describe('An ActorRdfUpdateQuadsDestination instance', () => {
    const actor = new (<any> ActorRdfUpdateQuadsDestination)({ name: 'actor', bus });
    actor.getDestination = () => ({
      insert: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    });

    describe('getContextDestinationUrl', () => {
      it('should return undefined when no source is available', () => {
        // eslint-disable-next-line unicorn/no-useless-undefined
        return expect(getContextDestinationUrl(undefined)).toEqual(undefined);
      });

      it('should return undefined when no indirect source is available', () => {
        return expect(getContextDestinationUrl({ value: <any> null })).toEqual(undefined);
      });

      it('should return when a source is available', () => {
        return expect(getContextDestinationUrl({ value: 'abc' })).toEqual('abc');
      });

      it('should strip away everything after the hash', () => {
        return expect(getContextDestinationUrl({ value: 'http://ex.org/#abcdef#xyz' })).toEqual('http://ex.org/');
      });
    });

    it('should have a default test implementation', () => {
      return expect(actor.test(null)).resolves.toBeTruthy();
    });

    it('should run without streams', () => {
      return actor.run({}).then(async(output: any) => {
        await expect(output.execute()).resolves.toBeUndefined();
      });
    });

    it('should run with streams', () => {
      return actor.run({
        quadStreamInsert: new ArrayIterator([]),
        quadStreamDelete: new ArrayIterator([]),
      }).then(async(output: any) => {
        await expect(output.execute()).resolves.toBeUndefined();
      });
    });
  });
});
