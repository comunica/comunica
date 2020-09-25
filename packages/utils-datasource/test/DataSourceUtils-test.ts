import { ActionContext } from '@comunica/core';
import { DataSourceUtils } from '..';

describe('DataSourceUtils', () => {
  const contextUndefined = undefined;
  const contextWithSource: ActionContext = ActionContext(
    { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'a-type', value: 'a-value' }},
  );
  const contextWithSingleMultipleSources: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': [
      { type: 'a-type', value: 'a-value' },
    ],
  });
  const contextWithMultipleSources: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': [
      { type: 'a-type', value: 'a-value' },
      { type: 'a-type', value: 'a-value' },
    ],
  });
  const contextNotEnded: ActionContext = ActionContext({
    '@comunica/bus-rdf-resolve-quad-pattern:sources': [],
  });

  describe('#getSingleSource', () => {
    it('should extract single source when source is set', () => {
      const source = DataSourceUtils.getSingleSource(contextWithSource);
      return expect(source).resolves.toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return undefined when context undefined', () => {
      const source = DataSourceUtils.getSingleSource(contextUndefined);
      return expect(source).resolves.toEqual(undefined);
    });

    it('should return the first source when one sources is defined in the list of sources', () => {
      const source = DataSourceUtils.getSingleSource(contextWithSingleMultipleSources);
      return expect(source).resolves.toEqual({ type: 'a-type', value: 'a-value' });
    });

    it('should return undefined when multiple sources are defined in the list of sources', () => {
      const source = DataSourceUtils.getSingleSource(contextWithMultipleSources);
      return expect(source).resolves.toEqual(undefined);
    });

    it('return undefined for sources that are not ended', async() => {
      const source = DataSourceUtils.getSingleSource(contextNotEnded);
      await expect(source).resolves.toEqual(undefined);
    });
  });

  describe('#getSingleSourceType', () => {
    it('should return the type of the source', () => {
      const sourceType = DataSourceUtils.getSingleSourceType(contextWithSource);
      return expect(sourceType).resolves.toEqual('a-type');
    });

    it('should return undefined when non singular source', () => {
      const sourceType = DataSourceUtils.getSingleSourceType(contextWithMultipleSources);
      return expect(sourceType).resolves.toEqual(undefined);
    });

    it('should return undefined when no source', () => {
      const sourceType = DataSourceUtils.getSingleSourceType(contextUndefined);
      return expect(sourceType).resolves.toEqual(undefined);
    });

    it('should return type when only one source in the list of sources', () => {
      const sourceType = DataSourceUtils.getSingleSourceType(contextWithSingleMultipleSources);
      return expect(sourceType).resolves.toEqual('a-type');
    });
  });

  describe('#singleSourceHasType', () => {
    it('should return true if type of source is equal to required type', () => {
      const sourceType = DataSourceUtils.singleSourceHasType(contextWithSource, 'a-type');
      return expect(sourceType).resolves.toEqual(true);
    });

    it('should return false if type of source is not equal to required type', () => {
      const sourceType = DataSourceUtils.singleSourceHasType(contextWithSource, 'some-other-type');
      return expect(sourceType).resolves.toEqual(false);
    });

    it('should return true when only one source in sources list', () => {
      const sourceType = DataSourceUtils.singleSourceHasType(contextWithSingleMultipleSources, 'a-type');
      return expect(sourceType).resolves.toEqual(true);
    });

    it('should return false when non singular source', () => {
      const sourceType = DataSourceUtils.singleSourceHasType(contextWithMultipleSources, 'a-type');
      return expect(sourceType).resolves.toEqual(false);
    });

    it('should return false when no source', () => {
      const sourceType = DataSourceUtils.singleSourceHasType(contextUndefined, 'a-type');
      return expect(sourceType).resolves.toEqual(false);
    });
  });
});
