import * as Path from 'node:path';
import { QueryEngineBase } from '../lib/QueryEngineBase';
import { QueryEngineFactoryBase } from '../lib/QueryEngineFactoryBase';

jest.setTimeout(30_000);

describe('QueryEngineFactoryBase', () => {
  let factory: QueryEngineFactoryBase<any>;

  beforeEach(() => {
    factory = new QueryEngineFactoryBase(
      Path.join(__dirname, '../../../engines/query-sparql/'),
      Path.join(__dirname, '../../../engines/query-sparql/config/config-default.json'),
      actor => new QueryEngineBase(actor),
    );
  });

  describe('create', () => {
    it('should return a query engine', async() => {
      await expect(factory.create({})).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('should return a query engine without options', async() => {
      await expect(factory.create()).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with mainModulePath option', async() => {
      const opts = {
        mainModulePath: Path.join(__dirname, '../'),
      };
      await expect(factory.create(opts)).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with configPath option', async() => {
      const opts = {
        configPath: Path.join(__dirname, '../../../engines/query-sparql/config/config-default.json'),
      };
      await expect(factory.create(opts)).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with instanceUri option', async() => {
      const opts = {
        instanceUri: 'urn:comunica:default:init/actors#query',
      };
      await expect(factory.create(opts)).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('with runnerInstanceUri option', async() => {
      const opts = {
        runnerInstanceUri: 'urn:comunica:default:Runner',
      };
      await expect(factory.create(opts)).resolves
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
