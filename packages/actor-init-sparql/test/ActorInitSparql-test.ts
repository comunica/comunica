import { PassThrough, Readable, Transform } from 'stream';
import { ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorInit } from '@comunica/bus-init';
import {
  KeysCore,
  KeysHttp,
  KeysHttpMemento, KeysHttpProxy,
  KeysInitSparql,
  KeysRdfResolveQuadPattern, KeysRdfUpdateQuads,
} from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import { LoggerPretty } from '@comunica/logger-pretty';
import type {
  IPhysicalQueryPlanLogger,
  IQueryableResultBindingsEnhanced,
  IQueryableResultQuadsEnhanced,
} from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { translate } from 'sparqlalgebrajs';
import Factory from 'sparqlalgebrajs/lib/factory';
import * as stringifyStream from 'stream-to-string';
import { ActorInitSparql } from '../lib/ActorInitSparql';
import { ActorInitSparqlBase } from '../lib/ActorInitSparqlBase';
import { CliArgsHandlerBase } from '../lib/cli/CliArgsHandlerBase';
import type { ICliArgsHandler } from '../lib/cli/ICliArgsHandler';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('ActorInitSparqlBase', () => {
  it('should not allow invoking its run method', () => {
    return expect(new (<any> ActorInitSparqlBase)({ bus: new Bus({ name: 'bus' }) }).run()).rejects.toBeTruthy();
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('ActorInitSparql', () => {
  let bus: any;
  let logger: any;
  let mediatorOptimizeQueryOperation: any;
  let mediatorQueryOperation: any;
  let mediatorSparqlParse: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;

  const contextKeyShortcuts = {
    initialBindings: '@comunica/actor-init-sparql:initialBindings',
    log: '@comunica/core:log',
    queryFormat: '@comunica/actor-init-sparql:queryFormat',
    source: '@comunica/bus-rdf-resolve-quad-pattern:source',
    sources: '@comunica/bus-rdf-resolve-quad-pattern:sources',
  };

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
  });

  describe('The ActorInitSparql module', () => {
    it('should be a function', () => {
      expect(ActorInitSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorInitSparql constructor', () => {
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInitSparql);
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize },
      ))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorInitSparql)(); }).toThrow();
    });
  });

  describe('An ActorInitSparql instance', () => {
    const sourceHypermedia = 'http://example.org/';
    const sourceSparqlTagged = 'sparql@http://example.org/';
    const sourceAuth = 'http://username:passwd@example.org/';
    const sourceSparqlTaggedAuth = 'sparql@http://username:passwd@example.org/';
    const sourceOther = 'other@http://example.org/';
    const queryString = 'SELECT * WHERE { ?s ?p ?o } LIMIT 100';
    const context: any = JSON.stringify({ hypermedia: sourceHypermedia });
    let input: Readable;
    let actor: ActorInitSparql;
    let actorFixedQuery: ActorInitSparql;
    let actorFixedContext: ActorInitSparql;
    let actorFixedQueryAndContext: ActorInitSparql;
    const mediatorContextPreprocess: any = {
      mediate: (action: any) => Promise.resolve(action),
    };

    beforeEach(() => {
      jest.resetAllMocks();
      input = new Readable({ objectMode: true });
      input._read = () => {
        const triple = { a: 'triple' };
        input.push(triple);
        input.push(null);
      };
      const factory = new Factory();
      mediatorQueryOperation.mediate = jest.fn((action: any) => {
        if (action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
          (<IPhysicalQueryPlanLogger> action.context.get(KeysInitSparql.physicalQueryPlanLogger))
            .logOperation(
              'logicalOp',
              'physicalOp',
              {},
              undefined,
              'actor',
              {},
            );
        }
        return action.operation !== 'INVALID' ?
          Promise.resolve({ type: 'bindings', bindingsStream: input }) :
          Promise.reject(new Error('Invalid query'));
      });
      mediatorSparqlParse.mediate = (action: any) => action.query === 'INVALID' ?
        Promise.resolve({ operation: action.query }) :
        Promise.resolve({
          baseIRI: action.query.includes('BASE') ? 'myBaseIRI' : null,
          operation: factory.createProject(
            factory.createBgp([
              factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            ]),
            [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          ),
        });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitSparql(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat,
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
      actorFixedQuery = new ActorInitSparql(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor',
          queryString },
      );
      actorFixedContext = new ActorInitSparql(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor',
          context },
      );
      actorFixedQueryAndContext = new ActorInitSparql(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor',
          queryString,
          context },
      );
    });

    describe('invalidateHttpCache', () => {
      it('should call the HTTP invalidate mediator', async() => {
        jest.spyOn(mediatorHttpInvalidate, 'mediate');
        await actor.invalidateHttpCache('a');
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ url: 'a' });
      });
    });

    describe('query', () => {
      it('should apply bindings when initialBindings are passed via the context', () => {
        const ctx = { '@comunica/actor-init-sparql:initialBindings': BF.bindings({ '?s': DF.literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx = { initialBindings: BF.bindings({ '?s': DF.literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when sources in the old format are passed via the context', () => {
        const ctx = { sources: []};
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow query to be called without context', () => {
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }'))
          .resolves.toBeTruthy();
      });

      it('should allow KeysInitSparql.queryTimestamp to be set', () => {
        const ctx = { [KeysInitSparql.queryTimestamp.name]: new Date() };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow a parsed query to be passd', () => {
        return expect(actor.query(translate('SELECT * WHERE { ?s ?p ?o }')))
          .resolves.toBeTruthy();
      });

      it('should not modify the baseIRI without BASE in query', async() => {
        expect((<any> (await actor.query('SELECT * WHERE { ?s ?p ?o }')).context)
          .toJS()['@comunica/actor-init-sparql:baseIRI']).toBeFalsy();
      });

      it('should allow a query to modify the context\'s baseIRI', async() => {
        expect((<any> (await actor.query('BASE <http://example.org/book/> SELECT * WHERE { ?s ?p ?o }')).context)
          .toJS())
          .toMatchObject({
            '@comunica/actor-init-sparql:baseIRI': 'myBaseIRI',
          });
      });

      it('should pass down the provided context if optimize actors do not return one', async() => {
        mediatorOptimizeQueryOperation.mediate = (action: any) => {
          return Promise.resolve({ ...action, context: undefined });
        };
        const result = await actor.query('SELECT * WHERE { ?s ?p ?o }', { 'the-answer': 42 });
        expect(result).toHaveProperty('context');
        expect((<ActionContext> result.context).getRaw('the-answer')).toEqual(42);
      });

      it('should allow optimize actors to modify the context', async() => {
        mediatorOptimizeQueryOperation.mediate = (action: any) => {
          return Promise.resolve({
            ...action,
            context: action.context.setRaw('the-answer', 42),
          });
        };
        const result = await actor.query('SELECT * WHERE { ?s ?p ?o }');
        expect(result).toHaveProperty('context');
        expect((<ActionContext> result.context).getRaw('the-answer')).toEqual(42);
      });

      it('bindings() should collect all bindings until "end" event occurs on triples', async() => {
        const ctx = { sources: []};
        const result = await actor.query('SELECT * WHERE { ?s ?p ?o }', ctx);
        const array = await (<IQueryableResultBindingsEnhanced> result).bindings();
        expect(array).toEqual([{ a: 'triple' }]);
      });

      it('bindings() should return empty list if no solutions', async() => {
        const ctx = { sources: []};
        // Set input empty
        const inputThis = new Readable({ objectMode: true });
        inputThis._read = () => {
          inputThis.push(null);
        };
        mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
          Promise.resolve({ bindingsStream: inputThis, type: 'bindings' }) :
          Promise.reject(new Error('a'));
        const result = await actor.query('SELECT * WHERE { ?s ?p ?o }', ctx);
        const array = await (<IQueryableResultBindingsEnhanced> result).bindings();
        expect(array).toEqual([]);
      });

      it('should return a rejected promise on an invalid request', () => {
        const ctx = { sources: []};
        // Make it reject instead of reading input
        mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
        return expect(actor.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
      });

      it('should return a rejected promise on an explain', () => {
        const ctx = { sources: [], [KeysInitSparql.explain.name]: 'parsed' };
        return expect(actor.query('BLA', ctx)).rejects
          .toThrowError('Tried to explain a query when in query-only mode');
      });
    });

    describe('getResultMediaTypeFormats', () => {
      it('should return the media type formats', () => {
        const med: any = {
          mediate: (arg: any) => Promise.resolve({ mediaTypeFormats: { data: 'DATA' }}),
        };
        actor = new ActorInitSparql(
          { bus,
            contextKeyShortcuts,
            logger,
            mediatorContextPreprocess,
            mediatorHttpInvalidate,
            mediatorOptimizeQueryOperation,
            mediatorQueryOperation,
            mediatorSparqlParse,
            mediatorSparqlSerialize: med,
            mediatorSparqlSerializeMediaTypeCombiner: med,
            mediatorSparqlSerializeMediaTypeFormatCombiner: med,
            name: 'actor',
            queryString },
        );
        return expect(actor.getResultMediaTypeFormats())
          .resolves.toEqual({ data: 'DATA' });
      });
    });

    describe('test', () => {
      it('should test', () => {
        return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
      });
    });

    describe('run', () => {
      it('emits to stderr for no argv', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the -v options', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-v' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('Comunica Init Actor');
        expect(stderr).toContain('dev');
      });

      it('handles the --version option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '--version' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('Comunica Init Actor');
        expect(stderr).toContain('dev');
      });

      it('handles the -v option when not in a dev environment', async() => {
        jest.spyOn(CliArgsHandlerBase, 'isDevelopmentEnvironment').mockReturnValue(false);
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-v' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('Comunica Init Actor');
        expect(stderr).not.toContain('dev');
      });

      it('handles the -h option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-h' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the --help option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '--help' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the --listformats option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ '--listformats' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain('mediaTypes');
      });

      it('handles the media type option -t', async() => {
        const spy = jest.spyOn(actor, 'resultToString');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, queryString, '-t', 'testtype' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(expect.anything(), 'testtype', expect.anything());
      });

      it('handles the old inline context form', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ `{ "bla": true }`, 'Q' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith('Q', {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysCore.log.name]: expect.any(LoggerPretty),
          bla: true,
        });
      });

      it('handles a hypermedia source and query', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr for a hypermedia source without a query', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('rejects for a hypermedia source and an invalid query', async() => {
        await expect(actor.run({
          argv: [ sourceHypermedia, 'INVALID' ],
          env: {},
          stdin: new PassThrough(),
        })).rejects.toThrowError('Invalid query');
      });

      it('handles a hypermedia source and query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr with a hypermedia source and a empty query option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles a hypermedia source and query file option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-f', `${__dirname}/assets/all-100.sparql` ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(`SELECT * WHERE {
  ?s ?p ?o
}
LIMIT 100
`, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr with a hypermedia source and a empty query file option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-f' ],
          env: {},
          stdin: new PassThrough(),
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('rejects with a hypermedia source and a query file option to an invalid path', async() => {
        await expect(actor.run({ argv: [ sourceHypermedia, '-f', `${__dirname}filedoesnotexist.sparql` ],
          env: {},
          stdin: new PassThrough() })).rejects.toThrowError('no such file or directory');
      });

      it('handles a tagged sparql source and query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTagged, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'sparql', value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles credentials in url and query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceAuth, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{
            value: sourceHypermedia,
            context: new ActionContext({
              [KeysHttp.auth.name]: 'username:passwd',
            }),
          }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles a tagged sparql and credentials in url and query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTaggedAuth, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{
            type: 'sparql',
            value: sourceHypermedia,
            context: new ActionContext({
              [KeysHttp.auth.name]: 'username:passwd',
            }),
          }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles an other source type and query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceOther, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'other', value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles multiple hypermedia sources and a query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, sourceHypermedia, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }, { value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles multiple tagged sparql sources and a query option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTagged, sourceSparqlTagged, '-q', queryString ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [
            { type: 'sparql', value: sourceHypermedia },
            { type: 'sparql', value: sourceHypermedia },
          ],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles query and a config file option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ queryString, '-c', `${__dirname}/assets/config.json` ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          entrypoint: 'http://example.org/',
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles the datetime -d option', async() => {
        const dt: Date = new Date();
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-d', dt.toISOString() ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttpMemento.datetime.name]: dt,
        });
      });

      it('handles the logger -l option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-l', 'warn' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: new LoggerPretty({ level: 'warn' }),
        });
      });

      it('does not handle the logger -l option if the context already has a logger', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-l', 'warn' ],
          env: {},
          stdin: new PassThrough(),
          context: new ActionContext({
            log: 'LOGGER',
          }),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: 'LOGGER',
        });
      });

      it('handles the baseIRI -b option', async() => {
        const baseIRI = 'http://example.org';
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-b', baseIRI ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitSparql.baseIRI.name]: baseIRI,
        });
      });

      it('handles the proxy -p option', async() => {
        const proxy = 'http://proxy.org/';
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-p', proxy ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttpProxy.httpProxyHandler.name]: new ProxyHandlerStatic(proxy),
        });
      });

      it('handles the --lenient flag', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--lenient' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitSparql.lenient.name]: true,
        });
      });

      it('handles the destination --to option', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--to', 'http://target.com/' ],
          env: {},
          stdin: new PassThrough(),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysRdfUpdateQuads.destination.name]: 'http://target.com/',
        });
      });

      it('handles a cliArgsHandler', async() => {
        const spy = jest.spyOn(actor, 'queryOrExplain');
        const cliArgsHandler: ICliArgsHandler = {
          populateYargs(args) {
            return args.options({
              bla: {
                description: 'blabla',
              },
            });
          },
          async handleArgs(args, ctx) {
            ctx.bla = args.bla;
          },
        };
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--bla', 'BLA' ],
          env: {},
          stdin: new PassThrough(),
          context: new ActionContext({
            [KeysInitSparql.cliArgsHandlers.name]: [ cliArgsHandler ],
          }),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spy).toHaveBeenCalledWith(queryString, {
          [KeysInitSparql.queryFormat.name]: 'sparql',
          [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitSparql.cliArgsHandlers.name]: [ cliArgsHandler ],
          bla: 'BLA',
        });
      });

      describe('output format', () => {
        it('defaults to application/json for bindingsStream', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'bindings', bindingsStream: true }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitSparql(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorSparqlParse,
              mediatorSparqlSerialize: m2,
              mediatorSparqlSerializeMediaTypeCombiner: m2,
              mediatorSparqlSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({ argv: [ 'S' ], env: {}, stdin: new PassThrough() })).stdout)
            .toEqual('application/json');
        });

        it('defaults to application/trig for quadStream', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'quads', quadStream: true }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitSparql(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorSparqlParse,
              mediatorSparqlSerialize: m2,
              mediatorSparqlSerializeMediaTypeCombiner: m2,
              mediatorSparqlSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({ argv: [ 'S' ], env: {}, stdin: new PassThrough() })).stdout)
            .toEqual('application/trig');
        });

        it('defaults to simple for boolean', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'boolean', booleanResult: Promise.resolve(true) }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitSparql(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorSparqlParse,
              mediatorSparqlSerialize: m2,
              mediatorSparqlSerializeMediaTypeCombiner: m2,
              mediatorSparqlSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({ argv: [ 'S' ], env: {}, stdin: new PassThrough() })).stdout)
            .toEqual('simple');
        });
      });

      describe('for a fixed query', () => {
        it('handles a single source', async() => {
          const spy = jest.spyOn(actorFixedQuery, 'queryOrExplain');
          const stdout = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [ 'SOURCE' ],
            env: {},
            stdin: new PassThrough(),
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spy).toHaveBeenCalledWith(queryString, {
            [KeysInitSparql.queryFormat.name]: 'sparql',
            [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('handles the query format option -i', async() => {
          const spy = jest.spyOn(actorFixedQuery, 'queryOrExplain');
          const stdout = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [ 'SOURCE', '-i', 'graphql' ],
            env: {},
            stdin: new PassThrough(),
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spy).toHaveBeenCalledWith(queryString, {
            [KeysInitSparql.queryFormat.name]: 'graphql',
            [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('emits to stderr for no args', async() => {
          const stderr = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [],
            env: {},
            stdin: new PassThrough(),
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });

        it('emits to stderr for no argv when the default query is falsy', async() => {
          const actorThis = new ActorInitSparql(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation,
              mediatorSparqlParse,
              mediatorSparqlSerialize,
              mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
              mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
              name: 'actor',
              queryString: <any> null },
          );

          const stderr = await stringifyStream(<any> (await actorThis.run({
            argv: [],
            env: {},
            stdin: new PassThrough(),
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });
      });

      describe('for a fixed query and context', () => {
        it('handles no args', async() => {
          const spy = jest.spyOn(actorFixedQueryAndContext, 'queryOrExplain');
          const stdout = await stringifyStream(<any> (await actorFixedQueryAndContext.run({
            argv: [],
            env: {},
            stdin: new PassThrough(),
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spy).toHaveBeenCalledWith(queryString, {
            [KeysInitSparql.queryFormat.name]: 'sparql',
            [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
            [KeysCore.log.name]: expect.any(LoggerPretty),
            hypermedia: 'http://example.org/',
          });
        });
      });

      describe('for a fixed context', () => {
        it('emits to stderr for no argv', async() => {
          const stderr = await stringifyStream(<any> (await actorFixedContext.run({
            argv: [],
            env: {},
            stdin: new PassThrough(),
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });
      });

      describe('explain', () => {
        it('in parsed mode', async() => {
          const spy = jest.spyOn(actor, 'queryOrExplain');
          const stdout = await stringifyStream(<any> (await actor.run({
            argv: [ 'SOURCE', '-q', queryString, '--explain', 'parsed' ],
            env: {},
            stdin: new PassThrough(),
          })).stdout);
          expect(stdout).toContain(`{
  "type": "project",
  "input": {
    "type": "bgp",
    "patterns": [
      {
        "termType": "Quad",
        "value": "",
        "subject": {
          "termType": "Variable",
          "value": "s"
        },
        "predicate": {
          "termType": "Variable",
          "value": "p"
        },
        "object": {
          "termType": "Variable",
          "value": "o"
        },
        "graph": {
          "termType": "DefaultGraph",
          "value": ""
        },
        "type": "pattern"
      }
    ]
  },
  "variables": [
    {
      "termType": "Variable",
      "value": "s"
    },
    {
      "termType": "Variable",
      "value": "p"
    },
    {
      "termType": "Variable",
      "value": "o"
    }
  ]
}`);
          expect(spy).toHaveBeenCalledWith(queryString, {
            [KeysInitSparql.explain.name]: 'parsed',
            [KeysInitSparql.queryFormat.name]: 'sparql',
            [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('in logical mode', async() => {
          const spy = jest.spyOn(actor, 'queryOrExplain');
          const stdout = await stringifyStream(<any> (await actor.run({
            argv: [ 'SOURCE', '-q', queryString, '--explain', 'logical' ],
            env: {},
            stdin: new PassThrough(),
          })).stdout);
          expect(stdout).toContain(`{
  "type": "project",
  "input": {
    "type": "bgp",
    "patterns": [
      {
        "termType": "Quad",
        "value": "",
        "subject": {
          "termType": "Variable",
          "value": "s"
        },
        "predicate": {
          "termType": "Variable",
          "value": "p"
        },
        "object": {
          "termType": "Variable",
          "value": "o"
        },
        "graph": {
          "termType": "DefaultGraph",
          "value": ""
        },
        "type": "pattern"
      }
    ]
  },
  "variables": [
    {
      "termType": "Variable",
      "value": "s"
    },
    {
      "termType": "Variable",
      "value": "p"
    },
    {
      "termType": "Variable",
      "value": "o"
    }
  ]
}`);
          expect(spy).toHaveBeenCalledWith(queryString, {
            [KeysInitSparql.explain.name]: 'logical',
            [KeysInitSparql.queryFormat.name]: 'sparql',
            [KeysInitSparql.queryTimestamp.name]: expect.any(Date),
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        describe('in physical mode', () => {
          it('for a bindings response', async() => {
            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: new PassThrough(),
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for a quads response', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitSparql.physicalQueryPlanLogger))
                  .logOperation(
                    'logicalOp',
                    'physicalOp',
                    {},
                    undefined,
                    'actor',
                    {},
                  );
              }
              return Promise.resolve({
                type: 'quads',
                quadStream: input,
              });
            });

            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: new PassThrough(),
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for a boolean', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitSparql.physicalQueryPlanLogger))
                  .logOperation(
                    'logicalOp',
                    'physicalOp',
                    {},
                    undefined,
                    'actor',
                    {},
                  );
              }
              return Promise.resolve({
                type: 'boolean',
                booleanResult: Promise.resolve(true),
              });
            });

            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: new PassThrough(),
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for an update', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitSparql.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitSparql.physicalQueryPlanLogger))
                  .logOperation(
                    'logicalOp',
                    'physicalOp',
                    {},
                    undefined,
                    'actor',
                    {},
                  );
              }
              return Promise.resolve({
                type: 'update',
                updateResult: Promise.resolve(true),
              });
            });

            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: new PassThrough(),
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });
        });
      });
    });
  });

  describe('An ActorInitSparql instance for quads', () => {
    const hypermedia = 'http://example.org/';
    let actor: ActorInitSparql;
    const mediatorContextPreprocess: any = {
      mediate: (action: any) => Promise.resolve(action),
    };

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push(DF.quad(
          DF.namedNode('http://dbpedia.org/resource/Renault_Dauphine'),
          DF.namedNode('http://dbpedia.org/ontology/assembly'),
          DF.namedNode('http://dbpedia.org/resource/Belgium'),
          DF.defaultGraph(),
        ));
        input.push(null);
      };
      const factory = new Factory();
      mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
        Promise.resolve({ quadStream: input, type: 'quads' }) :
        Promise.reject(new Error('a'));
      mediatorSparqlParse.mediate = (action: any) => action.query === 'INVALID' ?
        Promise.resolve(action.query) :
        Promise.resolve({
          baseIRI: action.query.includes('BASE') ? 'myBaseIRI' : null,
          operation: factory.createProject(
            factory.createBgp([
              factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
            ]),
            [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          ),
        });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitSparql(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat,
          logger,
          mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation,
          mediatorQueryOperation,
          mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor' },
      );
    });

    it('quads() should collect all quads until "end" event occurs', async() => {
      const ctx = { sources: []};
      const result = await actor.query('CONSTRUCT WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryableResultQuadsEnhanced> result).quads();
      expect(array).toEqual([ DF.quad(
        DF.namedNode('http://dbpedia.org/resource/Renault_Dauphine'),
        DF.namedNode('http://dbpedia.org/ontology/assembly'),
        DF.namedNode('http://dbpedia.org/resource/Belgium'),
        DF.defaultGraph(),
      ) ]);
    });

    it('quads() should return empty list if no solutions', async() => {
      const ctx = { sources: []};
      // Set input empty
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push(null);
      };
      mediatorQueryOperation.mediate = (action: any) => action.operation.query !== 'INVALID' ?
        Promise.resolve({ quadStream: input, type: 'quads' }) :
        Promise.reject(new Error('a'));
      const result = await actor.query('CONSTRUCT * WHERE { ?s ?p ?o }', ctx);
      const array = await (<IQueryableResultQuadsEnhanced> result).quads();
      expect(array).toEqual([]);
    });

    it('should return a rejected promise on an invalid request', () => {
      const ctx = { sources: []};
      // Make it reject instead of reading input
      mediatorQueryOperation.mediate = (action: any) => Promise.reject(new Error('a'));
      return expect(actor.query('INVALID QUERY', ctx)).rejects.toBeTruthy();
    });
  });
});
