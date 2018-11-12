import {
  Bindings,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {DataSources, KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import {AsyncReiterableArray} from "asyncreiterable";
import {AbstractMediatypeUtilities} from "..";

describe('AbstractMediatypeUtilities', () => {

  const contextNull: ActionContext = null;
  const contextWithSource: ActionContext = ActionContext(
    { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'a-type', value: 'a-value' }},
  );
  const contextWithSingleMultipleSources: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
      { type: 'a-type', value: 'a-value' },
    ]),
  });
  const contextWithMultipleSources: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromFixedData([
      { type: 'a-type', value: 'a-value' },
      { type: 'a-type', value: 'a-value' },
    ]),
  });
  const contextNotEnded: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': AsyncReiterableArray.fromInitialEmpty(),
  });

  describe('#getSingleSource', () => {
    it('should extract single source when source is set', () => {
      const source = AbstractMediatypeUtilities.getSingleSource(contextWithSource);
      return expect(source).resolves.toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return null when context null', () => {
      const source = AbstractMediatypeUtilities.getSingleSource(contextNull);
      return expect(source).resolves.toEqual(null);
    });

    it('should return the first source when one sources is defined in the list of sources', () => {
      const source = AbstractMediatypeUtilities.getSingleSource(contextWithSingleMultipleSources);
      return expect(source).resolves.toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return null when multiple sources are defined in the list of sources', () => {
      const source = AbstractMediatypeUtilities.getSingleSource(contextWithMultipleSources);
      return expect(source).resolves.toEqual(null);
    });

    it('return null for sources that are not ended', async () => {
      const source = AbstractMediatypeUtilities.getSingleSource(contextNotEnded);
      return expect(source).resolves.toEqual(null);
    });
  });

  describe('#getSingleSourceType', () => {
    it('should return the type of the source', () => {
      const sourceType = AbstractMediatypeUtilities.getSingleSourceType(contextWithSource);
      return expect(sourceType).resolves.toEqual('a-type');
    });

    it('should return null when non singular source', () => {
      const sourceType = AbstractMediatypeUtilities.getSingleSourceType(contextWithMultipleSources);
      return expect(sourceType).resolves.toEqual(null);
    });

    it('should return null when no source', () => {
      const sourceType = AbstractMediatypeUtilities.getSingleSourceType(contextNull);
      return expect(sourceType).resolves.toEqual(null);
    });

    it('should return type when only one source in the list of sources', () => {
      const sourceType = AbstractMediatypeUtilities.getSingleSourceType(contextWithSingleMultipleSources);
      return expect(sourceType).resolves.toEqual('a-type');
    });
  });

  describe('#singleSourceHasType', () => {
    it('should return true if type of source is equal to required type', () => {
      const sourceType = AbstractMediatypeUtilities.singleSourceHasType(contextWithSource, "a-type");
      return expect(sourceType).resolves.toEqual(true);
    });

    it('should return false if type of source is not equal to required type', () => {
      const sourceType = AbstractMediatypeUtilities.singleSourceHasType(contextWithSource, "some-other-type");
      return expect(sourceType).resolves.toEqual(false);
    });

    it('should return true when only one source in sources list', () => {
      const sourceType = AbstractMediatypeUtilities.singleSourceHasType(contextWithSingleMultipleSources, "a-type");
      return expect(sourceType).resolves.toEqual(true);
    });

    it('should return false when non singular source', () => {
      const sourceType = AbstractMediatypeUtilities.singleSourceHasType(contextWithMultipleSources, "a-type");
      return expect(sourceType).resolves.toEqual(false);
    });

    it('should return false when no source', () => {
      const sourceType = AbstractMediatypeUtilities.singleSourceHasType(contextNull, "a-type");
      return expect(sourceType).resolves.toEqual(false);
    });

  });
});
