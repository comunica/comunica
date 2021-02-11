import { Bus, ActionContext } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import { ActorRdfUpdateQuadsDestination, getDataDestinationType, getDataDestinationValue,
  getDataDestinationContext, isDataDestinationRawType } from '..';

const arrayifyStream = require('arrayify-stream');

describe('ActorRdfUpdateQuadsDestination', () => {
  const bus = new Bus({ name: 'bus' });
  const rdfjsStore: RDF.Store = <any> { remove: true };

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
        return expect(actor.getContextDestinationUrl(null)).toEqual(undefined);
      });

      it('should return undefined when no indirect source is available', () => {
        return expect(actor.getContextDestinationUrl({ value: null })).toEqual(undefined);
      });

      it('should return when a source is available', () => {
        return expect(actor.getContextDestinationUrl({ value: 'abc' })).toEqual('abc');
      });

      it('should strip away everything after the hash', () => {
        return expect(actor.getContextDestinationUrl({ value: 'http://ex.org/#abcdef#xyz' })).toEqual('http://ex.org/');
      });
    });

    it('should have a default test implementation', () => {
      return expect(actor.test(null)).resolves.toBeTruthy();
    });

    it('should run without streams', () => {
      return actor.run({}).then(async(output: any) => {
        await expect(output.updateResult).resolves.toBeUndefined();
      });
    });

    it('should run with streams', () => {
      return actor.run({
        quadStreamInsert: new ArrayIterator([]),
        quadStreamDelete: new ArrayIterator([]),
      }).then(async(output: any) => {
        await expect(output.updateResult).resolves.toBeUndefined();
      });
    });
  });

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
    const context = ActionContext({ key: 'value' });

    it('should return on a string source', () => {
      return expect(getDataDestinationContext('abc', context)).toEqual(context);
    });

    it('should return on a rdfjs source source', () => {
      return expect(getDataDestinationContext(rdfjsStore, context)).toEqual(context);
    });

    it('should return on an object source', () => {
      const sourceContext = ActionContext({ auth: 'username:passwd' });
      return expect(getDataDestinationContext({ value: 'http://google.com', context: sourceContext }, context))
        .toEqual(context.merge(sourceContext));
    });
  });
});
