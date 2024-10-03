import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySourceIdentifyRdfJs, QuerySourceRdfJs } from '..';
import 'jest-rdf';
import '@comunica/utils-jest';

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};
const DF = new DataFactory();

describe('ActorQuerySourceIdentifyRdfJs', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQuerySourceIdentifyRdfJs module', () => {
    it('should be a function', () => {
      expect(ActorQuerySourceIdentifyRdfJs).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyRdfJs constructor', () => {
      expect(new (<any> ActorQuerySourceIdentifyRdfJs)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentifyRdfJs);
      expect(new (<any> ActorQuerySourceIdentifyRdfJs)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentify);
    });

    it('should not be able to create new ActorQuerySourceIdentifyRdfJs objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQuerySourceIdentifyRdfJs)();
      }).toThrow(`Class constructor ActorQuerySourceIdentifyRdfJs cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQuerySourceIdentifyRdfJs instance', () => {
    let actor: ActorQuerySourceIdentifyRdfJs;
    let source: RDF.Source;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyRdfJs({ name: 'actor', bus, mediatorMergeBindingsContext });
      source = { match: () => <any> null };
    });

    describe('test', () => {
      it('should test', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: source },
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });

      it('should not test with sparql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'sparql', value: source },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor requires a single query source with rdfjs type to be present in the context.`);
      });

      it('should not test with string value', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: 'abc' },
          context: new ActionContext(),
        })).resolves.toFailTest(`actor received an invalid rdfjs query source.`);
      });

      it('should not test with invalid source value', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: <any>{}},
          context: new ActionContext(),
        })).resolves.toFailTest(`actor received an invalid rdfjs query source.`);
      });
    });

    describe('run', () => {
      it('should get the source', async() => {
        const contextIn = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
        const ret = await actor.run({
          querySourceUnidentified: { type: 'rdfjs', value: source },
          context: contextIn,
        });
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceRdfJs);
        expect(ret.querySource.context).not.toBe(contextIn);
      });

      it('should get the source with context', async() => {
        const contextIn = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
        const contextSource = new ActionContext();
        const ret = await actor.run({
          querySourceUnidentified: { type: 'rdfjs', value: source, context: contextSource },
          context: contextIn,
        });
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceRdfJs);
        expect(ret.querySource.context).not.toBe(contextIn);
        expect(ret.querySource.context).toBe(contextSource);
      });
    });
  });
});
