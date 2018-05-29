import {ActorContextPreprocess} from "@comunica/bus-context-preprocess";
import {Bus} from "@comunica/core";
import {ActorContextPreprocessRdfSourceIdentifier} from "../lib/ActorContextPreprocessRdfSourceIdentifier";

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
      return expect(actor.run({ context: {} })).resolves.toMatchObject({ context: {} });
    });

    it('should run for a context with zero sources', () => {
      return expect(actor.run({ context: { sources: [] } })).resolves
        .toMatchObject({ context: { sources: [] } });
    });

    it('should run for a context with two dummy sources', () => {
      return expect(actor.run({ context: { sources: [{ type: 'dummy' }, { type: 'dummy' }] } })).resolves
        .toMatchObject({ context: { sources: [{ type: 'dummy' }, { type: 'dummy' }] } });
    });

    it('should run for a context with two auto sources', () => {
      const context = { context: { sources: [{ type: 'auto', value: 'abc' }, { type: 'auto', value: 'def' }] } };
      return expect(actor.run(context)).resolves
        .toMatchObject({ context: { sources: [{ type: 'a', value: 'abc' }, { type: 'd', value: 'def' }] } });
    });

    it('should run for a context with a auto and a dummy source', () => {
      const context = { context: { sources: [{ type: 'auto', value: 'abc' }, { type: 'dummy' }] } };
      return expect(actor.run(context)).resolves
        .toMatchObject({ context: { sources: [{ type: 'a', value: 'abc' }, { type: 'dummy' }] } });
    });

    it('should run and keep the auto type if the mediator fails', () => {
      const context = { context: { sources: [{ type: 'auto' }] } };
      return expect(actor.run(context)).resolves
        .toMatchObject({ context: { sources: [{ type: 'auto' }] } });
    });
  });
});
