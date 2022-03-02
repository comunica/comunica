import { QueryEngineBase } from '../lib/QueryEngineBase';
import { QueryEngineFactoryBase } from '../lib/QueryEngineFactoryBase';

jest.setTimeout(30_000);

describe('QueryEngineFactoryBase', () => {
  let factory: QueryEngineFactoryBase<any>;

  beforeEach(() => {
    factory = new QueryEngineFactoryBase(
      `${__dirname}/../../../engines/query-sparql/`,
      `${__dirname}/../../../engines/query-sparql/config/config-default.json`,
      actor => new QueryEngineBase(actor),
    );
  });

  describe('create', () => {
    it('should return a query engine', async() => {
      expect(await factory.create({}))
        .toBeInstanceOf(QueryEngineBase);
    });

    it('should return a query engine without options', async() => {
      expect(await factory.create())
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with mainModulePath option', async() => {
      const opts = {
        mainModulePath: `${__dirname}/../`,
      };
      expect(await factory.create(opts))
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with configPath option', async() => {
      const opts = {
        configPath: `${__dirname}/../../../engines/query-sparql/config/config-default.json`,
      };
      expect(await factory.create(opts))
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with instanceUri option', async() => {
      const opts = {
        instanceUri: 'urn:comunica:default:init/actors#query',
      };
      expect(await factory.create(opts))
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with runnerInstanceUri option', async() => {
      const opts = {
        runnerInstanceUri: 'urn:comunica:default:Runner',
      };
      expect(await factory.create(opts))
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with invalid instanceUri option', async() => {
      const opts = {
        instanceUri: 'urn:comunica:myUNKNOWN',
      };
      await expect(factory.create(opts))
        .rejects.toThrow(new Error('No actor for key engine was found for IRI urn:comunica:myUNKNOWN.'));
    });
  });
});
