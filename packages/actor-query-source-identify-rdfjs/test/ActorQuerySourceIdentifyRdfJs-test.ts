import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ActorQuerySourceIdentifyRdfJs, QuerySourceRdfJs } from '..';
import 'jest-rdf';

const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
};

describe('ActorQuerySourceIdentifyRdfJs', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
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
        })).resolves.toBeTruthy();
      });

      it('should not test with sparql type', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'sparql', value: source },
          context: new ActionContext(),
        })).rejects.toThrow(`actor requires a single query source with rdfjs type to be present in the context.`);
      });

      it('should not test with string value', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: 'abc' },
          context: new ActionContext(),
        })).rejects.toThrow(`actor received an invalid rdfjs query source.`);
      });

      it('should not test with invalid source value', async() => {
        await expect(actor.test({
          querySourceUnidentified: { type: 'rdfjs', value: <any>{}},
          context: new ActionContext(),
        })).rejects.toThrow(`actor received an invalid rdfjs query source.`);
      });
    });

    describe('run', () => {
      it('should get the source', async() => {
        const contextIn = new ActionContext();
        const ret = await actor.run({
          querySourceUnidentified: { type: 'rdfjs', value: source },
          context: contextIn,
        });
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceRdfJs);
        expect(ret.querySource.context).not.toBe(contextIn);
      });

      it('should get the source with context', async() => {
        const contextIn = new ActionContext();
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
