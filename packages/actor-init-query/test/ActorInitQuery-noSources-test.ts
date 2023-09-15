import {
  KeysCore,
  KeysInitQuery,
  KeysRdfResolveQuadPattern,
} from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { LoggerPretty } from '@comunica/logger-pretty';
import type { IActionContext, IPhysicalQueryPlanLogger } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { PassThrough, Readable, Transform } from 'readable-stream';
import { Factory } from 'sparqlalgebrajs';

import { ActorInitQuery } from '../lib/ActorInitQuery';
import { QueryEngineBase } from '../lib/QueryEngineBase';
// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const stringifyStream = require('stream-to-string');

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
  const queryString = 'SELECT * WHERE { ?s ?p ?o } LIMIT 100';

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
    let actorAllowNoSources: ActorInitQuery;
    let spyResultToString: any;
    let spyQueryOrExplain: any;
    let mediatorMergeHandlers: any;
    beforeEach(() => {
      const factory = new Factory();
      mediatorMergeHandlers = {
        mediate(arg: any) {
          return {};
        },
      };

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
      actorAllowNoSources = new ActorInitQuery({
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
        mediatorMergeHandlers,
        name: 'actor',
        allowNoSources: true,
      });

      spyResultToString = jest.spyOn(QueryEngineBase.prototype, 'resultToString');
      spyQueryOrExplain = jest.spyOn(QueryEngineBase.prototype, 'queryOrExplain');
    });

    describe('with allowNoSources', () => {
      it('handles a single source', async() => {
        const stdout = await stringifyStream(<any>(await actorAllowNoSources.run({
          argv: [ 'SOURCE', queryString ],
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

      it('handles no sources', async() => {
        const stdout = await stringifyStream(<any>(await actorAllowNoSources.run({
          argv: [ queryString ],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stdout);
        expect(stdout).toContain(`{"a":"triple"}`);
        expect(spyQueryOrExplain).toHaveBeenCalledWith(queryString, {
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysCore.log.name]: expect.any(LoggerPretty),
        });
      });

      it('emits to stderr for no argv', async() => {
        const stderr = await stringifyStream(<any>(await actorAllowNoSources.run({
          argv: [],
          env: {},
          stdin: <Readable><any> new PassThrough(),
          context,
        })).stderr);
        expect(stderr).toContain('evaluates SPARQL queries');
        expect(stderr).toContain('A query must be provided');
      });
    });
  });
});
