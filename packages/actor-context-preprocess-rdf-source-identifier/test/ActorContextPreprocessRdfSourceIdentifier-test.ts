import {ActorContextPreprocess} from "@comunica/bus-context-preprocess";
import {ActionContext, Bus} from "@comunica/core";
import {AsyncReiterableArray} from "asyncreiterable";
import {ActorContextPreprocessRdfSourceIdentifier} from "../lib/ActorContextPreprocessRdfSourceIdentifier";
const arrayifyStream = require('arrayify-stream');

describe('ActorContextPreprocessRdfSourceIdentifier', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorContextPreprocessRdfSourceIdentifier module', () => {
    it('should be a function', () => {
      expect(ActorContextPreprocessRdfSourceIdentifier).toBeInstanceOf(Function);
    });

    it('should be a ActorContextPreprocessRdfSourceIdentifier constructor', () => {
      expect(new (<any> ActorContextPreprocessRdfSourceIdentifier)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorContextPreprocessRdfSourceIdentifier);
      expect(new (<any> ActorContextPreprocessRdfSourceIdentifier)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorContextPreprocess);
    });

    it('should not be able to create new ActorContextPreprocessRdfSourceIdentifier objects without \'new\'', () => {
      expect(() => { (<any> ActorContextPreprocessRdfSourceIdentifier)(); }).toThrow();
    });
  });

  describe('An ActorContextPreprocessRdfSourceIdentifier instance', () => {
    let actor: ActorContextPreprocessRdfSourceIdentifier;

    beforeEach(() => {
      const mediatorRdfSourceIdentifier: any = {
        mediate: (action) => action.sourceValue
          ? Promise.resolve({ sourceType: action.sourceValue[0] }) : Promise.resolve({}),
      };
      actor = new ActorContextPreprocessRdfSourceIdentifier({ name: 'actor', bus, mediatorRdfSourceIdentifier });
    });

    it('should test', () => {
      return expect(actor.test({})).resolves.toEqual(true);
    });

    it('should run for a null context', () => {
      return expect(actor.run({ context: null })).resolves.toMatchObject({ context: null });
    });

    it('should run for an empty context', () => {
      return expect(actor.run({ context: ActionContext({}) })).resolves.toMatchObject({ context: {} });
    });

    it('should run for a context with zero sources', async () => {
      return expect(await arrayifyStream((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').iterator()))
        .toEqual([]);
    });

    it('should run for a context with a single dummy source', async () => {
      const result = await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'dummy' } }),
      });
      return expect(result.context.get('@comunica/bus-rdf-resolve-quad-pattern:source'))
        .toEqual({ type: 'dummy' });
    });

    it('should run for a context with two dummy sources', async () => {
      return expect(await arrayifyStream((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
              { type: 'dummy' },
              { type: 'dummy' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').iterator()))
        .toEqual([{ type: 'dummy' }, { type: 'dummy' }]);
    });

    it('should run for a context with two ended dummy sources and block until the sources become ended', async () => {
      return expect((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
              { type: 'dummy' },
              { type: 'dummy' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').isEnded()).toBeTruthy();
    });

    it('should run for a context with two non-ended dummy sources and not block until the sources end', async () => {
      return expect((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromInitialData([
              { type: 'dummy' },
              { type: 'dummy' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').isEnded()).toBeFalsy();
    });

    it('should run for a context with a single auto source', async () => {
      const result = await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'auto', value: 'abc' } }),
      });
      return expect(result.context.get('@comunica/bus-rdf-resolve-quad-pattern:source'))
        .toEqual({ type: 'a', value: 'abc' });
    });

    it('should run for a context with two auto sources', async () => {
      return expect(await arrayifyStream((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
              { type: 'auto', value: 'abc' },
              { type: 'auto', value: 'def' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').iterator()))
    .toEqual([{ type: 'a', value: 'abc' }, { type: 'd', value: 'def' }]);
    });

    it('should run for a context with a auto and a dummy source', async () => {
      return expect(await arrayifyStream((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
              { type: 'auto', value: 'abc' },
              { type: 'dummy' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').iterator()))
    .toEqual([{ type: 'dummy' }, { type: 'a', value: 'abc' }]);
    });

    it('should run and keep the auto type if the mediator fails', async () => {
      return expect(await arrayifyStream((await actor.run({
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
              { type: 'auto' },
          ]) }),
      })).context.get('@comunica/bus-rdf-resolve-quad-pattern:sources').iterator()))
    .toEqual([{ type: 'auto' }]);
    });
  });
});
