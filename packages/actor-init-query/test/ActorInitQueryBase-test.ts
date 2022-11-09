import { Transform } from 'stream';
import { ActorInit } from '@comunica/bus-init';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorInitQueryBase } from '../lib/ActorInitQueryBase';

describe('ActorInitQueryBase', () => {
  let bus: any;
  let logger: any;
  let mediatorOptimizeQueryOperation: any;
  let mediatorQueryOperation: any;
  let mediatorSparqlParse: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let context: IActionContext;
  const mediatorContextPreprocess: any = {
    mediate: (action: any) => Promise.resolve(action),
  };
  const contextKeyShortcuts = {
    initialBindings: '@comunica/actor-init-query:initialBindings',
    log: '@comunica/core:log',
    queryFormat: '@comunica/actor-init-query:queryFormat',
    source: '@comunica/bus-rdf-resolve-quad-pattern:source',
    sources: '@comunica/bus-rdf-resolve-quad-pattern:sources',
  };
  const defaultQueryInputFormat = 'sparql';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    logger = null;
    mediatorOptimizeQueryOperation = {
      mediate: (arg: any) => Promise.resolve(arg),
    };
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
    mediatorSparqlSerialize = {
      mediate: (arg: any) => Promise.resolve(arg.mediaTypes ?
        { mediaTypes: arg } :
        {
          handle: {
            data: arg.handle.bindingsStream
              .pipe(new Transform({
                objectMode: true,
                transform: (e: any, enc: any, cb: any) => cb(null, JSON.stringify(e)),
              })),
          },
        }),
    };
    mediatorHttpInvalidate = {
      mediate: (arg: any) => Promise.resolve(true),
    };
    context = new ActionContext();
  });

  describe('The ActorInitQueryBase module', () => {
    it('should be a function', () => {
      expect(ActorInitQueryBase).toBeInstanceOf(Function);
    });

    it('should be a ActorInitQueryBase constructor', () => {
      expect(new (<any> ActorInitQueryBase)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInitQueryBase);
      expect(new (<any> ActorInitQueryBase)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitQueryBase objects without \'new\'', () => {
      expect(() => { (<any> ActorInitQueryBase)(); }).toThrow();
    });
  });

  describe('An ActorInitQueryBase instance', () => {
    let actor: ActorInitQueryBase;

    beforeEach(() => {
      actor = new ActorInitQueryBase({
        bus,
        contextKeyShortcuts,
        defaultQueryInputFormat,
        logger,
        mediatorContextPreprocess,
        mediatorHttpInvalidate,
        mediatorOptimizeQueryOperation,
        mediatorQueryOperation,
        mediatorQueryParse: mediatorSparqlParse,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      });
    });

    describe('test', () => {
      it('should be true', async() => {
        expect(await actor.test(<any> {})).toBeTruthy();
      });
    });

    describe('run', () => {
      it('should throw', async() => {
        await expect(actor.run(<any> {})).rejects
          .toThrow('ActorInitSparql#run is not supported in the browser.');
      });
    });
  });

  describe('An ActorInitQueryBase instance with extended contextKeyShortcuts', () => {
    it('should throw with duplicate shortcut extensions', async() => {
      expect(() => new ActorInitQueryBase({
        bus,
        contextKeyShortcutsExtensions: [
          { log: 'customKey' },
        ],
        contextKeyShortcuts,
        defaultQueryInputFormat,
        logger,
        mediatorContextPreprocess,
        mediatorHttpInvalidate,
        mediatorOptimizeQueryOperation,
        mediatorQueryOperation,
        mediatorQueryParse: mediatorSparqlParse,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      })).toThrow('Duplicate keys found while adding `contextKeyShortcutsExtensions`.');
    });

    it('should create context shortcuts with two additional keys', async() => {
      const actor = new ActorInitQueryBase({
        bus,
        contextKeyShortcutsExtensions: [
          { customField1: 'exampleShortcut1' },
          { customField2: 'exampleShortcut2' },
        ],
        contextKeyShortcuts,
        defaultQueryInputFormat,
        logger,
        mediatorContextPreprocess,
        mediatorHttpInvalidate,
        mediatorOptimizeQueryOperation,
        mediatorQueryOperation,
        mediatorQueryParse: mediatorSparqlParse,
        mediatorQueryResultSerialize: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeCombiner: mediatorSparqlSerialize,
        mediatorQueryResultSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
        name: 'actor',
      });

      expect(actor.contextKeyShortcuts.customField1).toBe('exampleShortcut1');
      expect(actor.contextKeyShortcuts.customField2).toBe('exampleShortcut2');
    });
  });
});
