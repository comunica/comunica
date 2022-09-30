import { ProxyHandlerStatic } from '@comunica/actor-http-proxy';
import {
  KeysCore,
  KeysHttp,
  KeysHttpMemento, KeysHttpProxy,
  KeysHttpWayback,
  KeysInitQuery, KeysQueryOperation,
  KeysRdfResolveQuadPattern, KeysRdfUpdateQuads,
} from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerPretty } from '@comunica/logger-pretty';
import type { IActionContext, ICliArgsHandler, IPhysicalQueryPlanLogger } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { PassThrough, Readable, Transform } from 'readable-stream';
import { Factory } from 'sparqlalgebrajs';
import * as stringifyStream from 'stream-to-string';
import { CliArgsHandlerBase } from '../lib';
import { ActorInitQuery } from '../lib/ActorInitQuery';
import { QueryEngineBase } from '../lib/QueryEngineBase';

const DF = new DataFactory();

describe('ActorInitQuery', () => {
  let bus: any;
  let logger: any;
  let mediatorOptimizeQueryOperation: any;
  let mediatorQueryOperation: any;
  let mediatorSparqlParse: any;
  let mediatorSparqlSerialize: any;
  let mediatorHttpInvalidate: any;
  let context: IActionContext;
  let input: Readable;

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
  const sourceHypermedia = 'http://example.org/';
  const sourceSparqlTagged = 'sparql@http://example.org/';
  const sourceAuth = 'http://username:passwd@example.org/';
  const sourceSparqlTaggedAuth = 'sparql@http://username:passwd@example.org/';
  const sourceOther = 'other@http://example.org/';
  const queryString = 'SELECT * WHERE { ?s ?p ?o } LIMIT 100';
  const contextString: any = JSON.stringify({ hypermedia: sourceHypermedia });

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    logger = null;
    mediatorOptimizeQueryOperation = {
      mediate: (arg: any) => Promise.resolve(arg),
    };
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
    mediatorSparqlSerialize = {
      mediate(arg: any) {
        return Promise.resolve(arg.mediaTypes ?
          { mediaTypes: arg } :
          {
            handle: {
              data: arg.handle.bindingsStream
                .pipe(new Transform({
                  objectMode: true,
                  transform: (e: any, enc: any, cb: any) => cb(null, JSON.stringify(e)),
                })),
            },
          });
      },
    };
    mediatorHttpInvalidate = {
      mediate: (arg: any) => Promise.resolve(true),
    };
    context = new ActionContext();
    input = new Readable({ objectMode: true });
    input._read = () => {
      const triple = { a: 'triple' };
      input.push(triple);
      input.push(null);
    };
    (<any> input).toArray = () => [ 'element' ];
  });

  describe('An ActorInitQuery instance', () => {
    let actor: ActorInitQuery;
    let actorFixedQuery: ActorInitQuery;
    let actorFixedContext: ActorInitQuery;
    let actorFixedQueryAndContext: ActorInitQuery;
    let spyResultToString: any;
    let spyQueryOrExplain: any;

    beforeEach(() => {
      const factory = new Factory();
      mediatorQueryOperation.mediate = jest.fn((action: any) => {
        if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
          (<IPhysicalQueryPlanLogger> action.context.get(KeysInitQuery.physicalQueryPlanLogger))
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
          Promise.resolve({ type: 'bindings', bindingsStream: input, metadata: () => ({}) }) :
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
      actor = new ActorInitQuery({
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
      actorFixedQuery = new ActorInitQuery(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
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
          queryString },
      );
      actorFixedContext = new ActorInitQuery(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
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
          context: contextString },
      );
      actorFixedQueryAndContext = new ActorInitQuery(
        { bus,
          contextKeyShortcuts,
          defaultQueryInputFormat: 'sparql',
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
          queryString,
          context: contextString },
      );

      spyResultToString = jest.spyOn(QueryEngineBase.prototype, 'resultToString');
      spyQueryOrExplain = jest.spyOn(QueryEngineBase.prototype, 'queryOrExplain');
    });

    describe('test', () => {
      it('should be true', async() => {
        expect(await actor.test(<any> {})).toBeTruthy();
      });
    });

    describe('run', () => {
      it('emits to stderr for no argv', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the -v options', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-v' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('Comunica Engine');
        expect(stderr).toContain('dev');
      });

      it('handles the --version option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '--version' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('Comunica Engine');
        expect(stderr).toContain('dev');
      });

      it('handles the -v option when not in a dev environment', async() => {
        jest.spyOn(CliArgsHandlerBase, 'isDevelopmentEnvironment').mockReturnValue(false);
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-v' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('Comunica Engine');
        expect(stderr).not.toContain('dev');
      });

      it('handles the -h option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '-h' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the --help option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ '--help' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles the --listformats option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ '--listformats' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain('mediaTypes');
      });

      it('handles the media type option -t', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, queryString, '-t', 'testtype' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyResultToString)
          .toHaveBeenCalledWith(expect.anything(), 'testtype', expect.anything());
      });

      it('handle the --localizeBlankNodes option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, queryString, '--localizeBlankNodes', 'true' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);

        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysQueryOperation.localizeBlankNodes.name]: true,
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles the old inline context form', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ `{ "bla": true }`, 'Q' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith('Q', {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysCore.log.name]: expect.any(LoggerPretty),
          bla: true,
        });
      });

      it('handles a hypermedia source and query', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr for a hypermedia source without a query', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('rejects for a hypermedia source and an invalid query', async() => {
        await expect(actor.run({
          argv: [ sourceHypermedia, 'INVALID' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).rejects.toThrowError('Invalid query');
      });

      it('handles a hypermedia source and query option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr with a hypermedia source and a empty query option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('handles a hypermedia source and query file option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-f', `${__dirname}/assets/all-100.sparql` ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(`SELECT * WHERE {
  ?s ?p ?o
}
LIMIT 100
`, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr with a hypermedia source and a empty query file option', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-f' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('At least one source and query must be provided');
      });

      it('rejects with a hypermedia source and a query file option to an invalid path', async() => {
        await expect(actor.run({
          argv: [ sourceHypermedia, '-f', `${__dirname}filedoesnotexist.sparql` ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).rejects.toThrowError('no such file or directory');
      });

      it('handles a tagged sparql source and query option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTagged, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'sparql', value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles credentials in url and query option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceAuth, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
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
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTaggedAuth, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
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
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceOther, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'other', value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles multiple hypermedia sources and a query option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, sourceHypermedia, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }, { value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles multiple tagged sparql sources and a query option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceSparqlTagged, sourceSparqlTagged, '-q', queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [
            { type: 'sparql', value: sourceHypermedia },
            { type: 'sparql', value: sourceHypermedia },
          ],
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles query and a config file option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ queryString, '-c', `${__dirname}/assets/config.json` ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          entrypoint: 'http://example.org/',
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('handles the datetime -d option', async() => {
        const dt: Date = new Date();
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-d', dt.toISOString() ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttpMemento.datetime.name]: dt,
        });
      });

      it('handles the recoverBrokenLinks -r option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-r' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: new LoggerPretty({ level: 'warn' }),
          [KeysHttpWayback.recoverBrokenLinks.name]: true,
        });
      });

      it('handles the logger -l option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-l', 'warn' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: new LoggerPretty({ level: 'warn' }),
        });
      });

      it('does not handle the logger -l option if the context already has a logger', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-l', 'warn' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context: new ActionContext({
            log: 'LOGGER',
          }),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: 'LOGGER',
        });
      });

      it('handles the baseIRI -b option', async() => {
        const baseIRI = 'http://example.org';
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-b', baseIRI ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitQuery.baseIRI.name]: baseIRI,
        });
      });

      it('handles the proxy -p option', async() => {
        const proxy = 'http://proxy.org/';
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '-p', proxy ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttpProxy.httpProxyHandler.name]: new ProxyHandlerStatic(proxy),
        });
      });

      it('handles the --lenient flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--lenient' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitQuery.lenient.name]: true,
        });
      });

      it('handles the --httpTimeout flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpTimeout=60' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttp.httpTimeout.name]: 60,
        });
      });

      it('handles the --httpBodyTimeout flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpTimeout=60', '--httpBodyTimeout' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttp.httpTimeout.name]: 60,
          [KeysHttp.httpBodyTimeout.name]: true,
        });
      });

      it('--httpBodyTimeout flag requires --httpTimeout', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpBodyTimeout' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain(`The --httpBodyTimeout option requires the --httpTimeout option to be set`);
      });

      it('handles the --httpRetryCount flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpRetryCount=2' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttp.httpRetryCount.name]: 2,
        });
      });

      it('handles the --httpRetryDelay flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpRetryCount=2', '--httpRetryDelay=500' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttp.httpRetryCount.name]: 2,
          [KeysHttp.httpRetryDelay.name]: 500,
        });
      });

      it('handles --httpRetryDelay flag requiring --httpRetryCount', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpRetryDelay=500' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain(`The --httpRetryDelay option requires the --httpRetryCount option to be set`);
      });

      it('handles the --httpRetryOnServerError flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpRetryCount=2', '--httpRetryOnServerError' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysHttp.httpRetryCount.name]: 2,
          [KeysHttp.httpRetryOnServerError.name]: true,
        });
      });

      it('handles --httpRetryOnServerError flag requiring --httpRetryCount', async() => {
        const stderr = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--httpRetryOnServerError' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain(`The --httpRetryOnServerError option requires the --httpRetryCount option to be set`);
      });

      it('handles the --unionDefaultGraph flag', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--unionDefaultGraph' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysQueryOperation.unionDefaultGraph.name]: true,
        });
      });

      it('handles the destination --to option', async() => {
        const stdout = await stringifyStream(<any> (await actor.run({
          argv: [ sourceHypermedia, '-q', queryString, '--to', 'http://target.com/' ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysRdfUpdateQuads.destination.name]: 'http://target.com/',
        });
      });

      it('handles a cliArgsHandler', async() => {
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
          stdin: <Readable><any> new PassThrough(),
          context: new ActionContext({
            [KeysInitQuery.cliArgsHandlers.name]: [ cliArgsHandler ],
          }),
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysRdfResolveQuadPattern.sources.name]: [{ value: sourceHypermedia }],
          [KeysCore.log.name]: expect.any(LoggerPretty),
          [KeysInitQuery.cliArgsHandlers.name]: [ cliArgsHandler ],
          bla: 'BLA',
        });
      });

      describe('output format', () => {
        it('defaults to application/json for bindingsStream', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'bindings', bindingsStream: true, metadata: () => ({}) }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitQuery(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorQueryParse: mediatorSparqlParse,
              mediatorQueryResultSerialize: m2,
              mediatorQueryResultSerializeMediaTypeCombiner: m2,
              mediatorQueryResultSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({
            argv: [ 'S' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout)
            .toEqual('application/json');
        });

        it('defaults to application/trig for quadStream', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'quads', quadStream: true }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitQuery(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorQueryParse: mediatorSparqlParse,
              mediatorQueryResultSerialize: m2,
              mediatorQueryResultSerializeMediaTypeCombiner: m2,
              mediatorQueryResultSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({
            argv: [ 'S' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout)
            .toEqual('application/trig');
        });

        it('defaults to simple for boolean', async() => {
          const m1: any = {
            mediate: (arg: any) => Promise.resolve({ type: 'boolean', booleanResult: Promise.resolve(true) }),
          };
          const m2: any = {
            mediate: (arg: any) => Promise.resolve({ handle: { data: arg.handleMediaType }}),
          };
          const actorThis = new ActorInitQuery(
            { bus,
              contextKeyShortcuts,
              logger,
              mediatorContextPreprocess,
              mediatorHttpInvalidate,
              mediatorOptimizeQueryOperation,
              mediatorQueryOperation: m1,
              mediatorQueryParse: mediatorSparqlParse,
              mediatorQueryResultSerialize: m2,
              mediatorQueryResultSerializeMediaTypeCombiner: m2,
              mediatorQueryResultSerializeMediaTypeFormatCombiner: m2,
              name: 'actor',
              queryString },
          );
          expect((await actorThis.run({
            argv: [ 'S' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout)
            .toEqual('simple');
        });
      });

      describe('for a fixed query', () => {
        it('handles a single source', async() => {
          const stdout = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [ 'SOURCE' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
            [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('handles the query format option -i', async() => {
          const stdout = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [ 'SOURCE', '-i', 'graphql' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
            [KeysInitQuery.queryFormat.name]: { language: 'graphql', version: '1.1' },
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('emits to stderr for no args', async() => {
          const stderr = await stringifyStream(<any> (await actorFixedQuery.run({
            argv: [],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });

        it('emits to stderr for no argv when the default query is falsy', async() => {
          const actorThis = new ActorInitQuery(
            { bus,
              contextKeyShortcuts,
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
              queryString: <any> null },
          );

          const stderr = await stringifyStream(<any> (await actorThis.run({
            argv: [],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });
      });

      describe('for a fixed query and context', () => {
        it('handles no args', async() => {
          const stdout = await stringifyStream(<any> (await actorFixedQueryAndContext.run({
            argv: [],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stdout);
          expect(stdout).toContain(`{"a":"triple"}`);
          expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
            [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
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
            stdin: <Readable><any> new PassThrough(),
            context,
          })).stderr);
          expect(stderr).toContain('evaluates SPARQL queries');
          expect(stderr).toContain('At least one source and query must be provided');
        });
      });

      describe('explain', () => {
        it('in parsed mode', async() => {
          const stdout = await stringifyStream(<any> (await actor.run({
            argv: [ 'SOURCE', '-q', queryString, '--explain', 'parsed' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
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
          expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
            [KeysInitQuery.explain.name]: 'parsed',
            [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        it('in logical mode', async() => {
          const stdout = await stringifyStream(<any> (await actor.run({
            argv: [ 'SOURCE', '-q', queryString, '--explain', 'logical' ],
            env: {},
            stdin: <Readable><any> new PassThrough(),
            context,
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
          expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
            [KeysInitQuery.explain.name]: 'logical',
            [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
            [KeysRdfResolveQuadPattern.sources.name]: [{ value: 'SOURCE' }],
            [KeysCore.log.name]: expect.any(LoggerPretty),
          });
        });

        describe('in physical mode', () => {
          it('for a bindings response', async() => {
            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: <Readable><any> new PassThrough(),
              context,
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for a quads response', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitQuery.physicalQueryPlanLogger))
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
              stdin: <Readable><any> new PassThrough(),
              context,
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for a boolean', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitQuery.physicalQueryPlanLogger))
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
                execute: () => Promise.resolve(true),
              });
            });

            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: <Readable><any> new PassThrough(),
              context,
            })).stdout);
            expect(stdout).toContain(`{
  "logical": "logicalOp",
  "physical": "physicalOp"
}`);
          });

          it('for an update', async() => {
            mediatorQueryOperation.mediate = jest.fn((action: any) => {
              if (action.context.has(KeysInitQuery.physicalQueryPlanLogger)) {
                (<IPhysicalQueryPlanLogger> action.context.get(KeysInitQuery.physicalQueryPlanLogger))
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
                type: 'void',
                execute: () => Promise.resolve(true),
              });
            });

            const stdout = await stringifyStream(<any> (await actor.run({
              argv: [ 'SOURCE', '-q', queryString, '--explain', 'physical' ],
              env: {},
              stdin: <Readable><any> new PassThrough(),
              context,
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
});
