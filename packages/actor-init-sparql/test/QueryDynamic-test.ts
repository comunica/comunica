import { ActorInitSparql } from '../lib/ActorInitSparql';
import { newEngineDynamicArged } from '../lib/QueryDynamic';

jest.setTimeout(30_000);

describe('newEngineDynamic', () => {
  it('should return a query engine', async() => {
    expect(await newEngineDynamicArged({}, `${__dirname}/../`, `${__dirname}/../config/config-default.json`))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with mainModulePath option', async() => {
    const opts = {
      mainModulePath: `${__dirname}/../`,
    };
    expect(await newEngineDynamicArged(opts,
      `${__dirname}/../`,
      `${__dirname}/../config/config-default.json`))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with configResourceUrl option', async() => {
    const opts = {
      configResourceUrl: `${__dirname}/../config/config-default.json`,
    };
    expect(await newEngineDynamicArged(opts,
      `${__dirname}/../`,
      `${__dirname}/../config/config-default.json`))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with instanceUri option', async() => {
    const opts = {
      instanceUri: 'urn:comunica:sparqlinit',
    };
    expect(await newEngineDynamicArged(opts, `${__dirname}/../`, `${__dirname}/../config/config-default.json`))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with runnerInstanceUri option', async() => {
    const opts = {
      runnerInstanceUri: 'urn:comunica:my',
    };
    expect(await newEngineDynamicArged(opts, `${__dirname}/../`, `${__dirname}/../config/config-default.json`))
      .toBeInstanceOf(ActorInitSparql);
  });

  it('with invalid instanceUri option', async() => {
    const opts = {
      instanceUri: 'urn:comunica:myUNKNOWN',
    };
    await expect(newEngineDynamicArged(opts, `${__dirname}/../`, `${__dirname}/../config/config-default.json`))
      .rejects.toThrow(new Error('No actor for key engine was found for IRI urn:comunica:myUNKNOWN.'));
  });
});
