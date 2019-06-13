import {ActorInitSparql} from "../lib/ActorInitSparql";
import {newEngineDynamicArged} from "../lib/QueryDynamic";

jest.setTimeout(20000);

describe('newEngineDynamic', () => {
  it('should return a query engine', async () => {
    return expect(await newEngineDynamicArged({}, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with mainModulePath option', async () => {
    const opts = {
      mainModulePath: __dirname + '/../',
    };
    return expect(await newEngineDynamicArged(opts, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with configResourceUrl option', async () => {
    const opts = {
      configResourceUrl: __dirname + '/../config/config-default.json',
    };
    return expect(await newEngineDynamicArged(opts, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with instanceUri option', async () => {
    const opts = {
      instanceUri: 'urn:comunica:sparqlinit',
    };
    return expect(await newEngineDynamicArged(opts, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with runnerInstanceUri option', async () => {
    const opts = {
      runnerInstanceUri: 'urn:comunica:my',
    };
    return expect(await newEngineDynamicArged(opts, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with invalid instanceUri option', async () => {
    const opts = {
      instanceUri: 'urn:comunica:myUNKNOWN',
    };
    return expect(newEngineDynamicArged(opts, __dirname + '/../', __dirname + '/../config/config-default.json'))
      .rejects.toThrow(new Error('No SPARQL init actor was found with the name \"urn:comunica:myUNKNOWN\" ' +
        'in runner \"urn:comunica:my\".'));
  });
});
