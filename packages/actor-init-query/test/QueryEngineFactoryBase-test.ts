import * as Path from 'node:path';
import { instantiateComponent, Runner } from '@comunica/runner';
import { QueryEngineBase } from '../lib/QueryEngineBase';
import { QueryEngineFactoryBase } from '../lib/QueryEngineFactoryBase';

// Instantiating a full engine from the Components.js config requires a scan of the whole module tree,
// and can take a while on slower CI machines.
jest.setTimeout(60_000);

jest.mock<typeof import('@comunica/runner')>('@comunica/runner', () => {
  const actual = jest.requireActual('@comunica/runner');
  return {
    ...actual,
    instantiateComponent: jest.fn(actual.instantiateComponent),
  };
});

const MODULE_ROOT_PATH = Path.join(__dirname, '../../../engines/query-sparql/');
const DEFAULT_CONFIG_PATH = Path.join(__dirname, '../../../engines/query-sparql/config/config-default.json');

describe('QueryEngineFactoryBase', () => {
  let factory: QueryEngineFactoryBase<any>;

  beforeEach(() => {
    factory = new QueryEngineFactoryBase(
      MODULE_ROOT_PATH,
      DEFAULT_CONFIG_PATH,
      actor => new QueryEngineBase(actor),
    );
  });

  describe('create', () => {
    it('should return a query engine', async() => {
      await expect(factory.create({})).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    it('should return a query engine with a mainModulePath option', async() => {
      const opts = {
        mainModulePath: Path.join(__dirname, '../'),
      };
      await expect(factory.create(opts)).resolves
        .toBeInstanceOf(QueryEngineBase);
    });

    describe('with a mocked config instantiation', () => {
      let actorQuery: any;
      let actorOther: any;

      beforeEach(() => {
        actorQuery = { name: 'urn:comunica:default:init/actors#query' };
        actorOther = { name: 'urn:comunica:other' };
        jest.mocked(instantiateComponent).mockResolvedValue(new Runner(<any> {}, [ actorQuery, actorOther ]));
      });

      afterEach(() => {
        jest.mocked(instantiateComponent).mockReset();
      });

      it('should return a query engine without options', async() => {
        const engine = await factory.create();
        expect(engine).toBeInstanceOf(QueryEngineBase);
        expect(engine.actorInitQuery).toBe(actorQuery);
        expect(instantiateComponent).toHaveBeenCalledWith(
          DEFAULT_CONFIG_PATH,
          'urn:comunica:default:Runner',
          { mainModulePath: MODULE_ROOT_PATH },
        );
      });

      it('with mainModulePath option', async() => {
        const opts = {
          mainModulePath: Path.join(__dirname, '../'),
        };
        await expect(factory.create(opts)).resolves
          .toBeInstanceOf(QueryEngineBase);
        expect(instantiateComponent).toHaveBeenCalledWith(
          DEFAULT_CONFIG_PATH,
          'urn:comunica:default:Runner',
          { mainModulePath: Path.join(__dirname, '../') },
        );
      });

      it('with configPath option', async() => {
        const opts = {
          configPath: 'other-config.json',
        };
        await expect(factory.create(opts)).resolves
          .toBeInstanceOf(QueryEngineBase);
        expect(instantiateComponent).toHaveBeenCalledWith(
          'other-config.json',
          'urn:comunica:default:Runner',
          { configPath: 'other-config.json', mainModulePath: MODULE_ROOT_PATH },
        );
      });

      it('with instanceUri option', async() => {
        const opts = {
          instanceUri: 'urn:comunica:other',
        };
        const engine = await factory.create(opts);
        expect(engine.actorInitQuery).toBe(actorOther);
      });

      it('with runnerInstanceUri option', async() => {
        const opts = {
          runnerInstanceUri: 'urn:comunica:other:Runner',
        };
        await expect(factory.create(opts)).resolves
          .toBeInstanceOf(QueryEngineBase);
        expect(instantiateComponent).toHaveBeenCalledWith(
          DEFAULT_CONFIG_PATH,
          'urn:comunica:other:Runner',
          { runnerInstanceUri: 'urn:comunica:other:Runner', mainModulePath: MODULE_ROOT_PATH },
        );
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
});
