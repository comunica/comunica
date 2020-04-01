import {ProxyHandlerStatic} from "@comunica/actor-http-proxy";
import {ActorInit} from "@comunica/bus-init";
import {Bindings, KEY_CONTEXT_QUERY_TIMESTAMP} from "@comunica/bus-query-operation";
import {Bus, KEY_CONTEXT_LOG} from "@comunica/core";
import {literal, variable} from "@rdfjs/data-model";
import {translate} from "sparqlalgebrajs";
import {PassThrough, Readable} from "stream";
import {ActorInitSparql} from "../lib/ActorInitSparql";
import {ActorInitSparql as ActorInitSparqlBrowser, KEY_CONTEXT_QUERYFORMAT} from "../lib/ActorInitSparql-browser";
import Factory from "sparqlalgebrajs/lib/factory";

describe('ActorInitSparqlBrowser', () => {
  it('should not allow invoking its run method', () => {
    return expect(new (<any> ActorInitSparqlBrowser)({ bus: new Bus({ name: 'bus' }) }).run()).rejects.toBeTruthy();
  });
});

describe('ActorInitSparql', () => {
  let bus;
  let logger;
  let mediatorOptimizeQueryOperation;
  let mediatorQueryOperation;
  let mediatorSparqlParse;
  let mediatorSparqlSerialize;
  let mediatorHttpInvalidate;

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
      mediate: (arg) => Promise.resolve(arg),
    };
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
    mediatorSparqlSerialize = {
      mediate: (arg) => Promise.resolve(arg.mediaTypes ? { mediaTypes: arg }
      : { handle: { data: arg.handle.bindingsStream } }),
    };
    mediatorHttpInvalidate = {
      mediate: (arg) => Promise.resolve(true),
    };
  });

  describe('The ActorInitSparql module', () => {
    it('should be a function', () => {
      expect(ActorInitSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorInitSparql constructor', () => {
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize }))
        .toBeInstanceOf(ActorInitSparql);
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, logger, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorInitSparql)(); }).toThrow();
    });
  });

  describe('An ActorInitSparql instance', () => {
    const hypermedia: string = "http://example.org/";
    const hypermedia2: string = "hypermedia@http://example.org/";
    const otherSource: string = "other@http://example.org/";
    const queryString: string = "SELECT * WHERE { ?s ?p ?o } LIMIT 100";
    const context: any = JSON.stringify({ hypermedia });
    let actor: ActorInitSparql;
    const mediatorContextPreprocess: any = {
      mediate: (action) => Promise.resolve(action),
    };

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push({ a: 'triple' });
        input.push(null);
      };
      const factory = new Factory();
      mediatorQueryOperation.mediate = (action) => action.operation.query !== 'INVALID'
        ? Promise.resolve({ bindingsStream: input }) : Promise.reject(new Error('a'));
      mediatorSparqlParse.mediate = (action) => action.query === 'INVALID'
        ? Promise.resolve(action.query)
        : Promise.resolve({
          baseIRI: action.query.indexOf('BASE') >= 0 ? 'myBaseIRI' : null,
          operation: factory.createProject(
            factory.createBgp([
              factory.createPattern(variable('s'), variable('p'), variable('o')),
            ]),
            [
              variable('s'),
              variable('p'),
              variable('o')
            ]
          ),
        });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, defaultQueryInputFormat, logger, mediatorContextPreprocess,
          mediatorHttpInvalidate, mediatorOptimizeQueryOperation, mediatorQueryOperation,
          mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize, name: 'actor' });
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
    });

    it('should run to stderr for no argv', () => {
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr on the -v option', () => {
      return expect(actor.run({ argv: [ '-v' ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr on the -v option when not in a dev environment', () => {
      (<any> actor).isDevelopmentEnvironment = () => false;
      return expect(actor.run({ argv: [ '-v' ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr on the --version option', () => {
      return expect(actor.run({ argv: [ '--version' ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr on the -h option', () => {
      return expect(actor.run({ argv: [ '-h' ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr on the --help option', () => {
      return expect(actor.run({ argv: [ '--help' ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run on the --listformats option', () => {
      return expect(actor.run({ argv: [ '--listformats' ], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
    });

    it('should have a default query format', async () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, defaultQueryInputFormat: 'sparql', logger, mediatorContextPreprocess,
          mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize, name: 'actor', queryString });
      const spy = jest.spyOn(actor, 'query');
      (await actor.run({ argv: [], env: {}, stdin: new PassThrough() }));
      return expect(spy.mock.calls[0][1][KEY_CONTEXT_QUERYFORMAT]).toEqual('sparql');
    });

    it('should allow the query format to be changed with -i', async () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize, mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor', queryString });
      const spy = jest.spyOn(actor, 'query');
      (await actor.run({ argv: [ '-i', 'graphql' ], env: {}, stdin: new PassThrough() }));
      return expect(spy.mock.calls[0][1][KEY_CONTEXT_QUERYFORMAT]).toEqual('graphql');
    });

    it('should allow a media type to be passed with -t', async () => {
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
          mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
      return expect((await actor.run({ argv: [ '-t', 'testtype' ], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('testtype');
    });

    it('should default to media type application/json when a bindingsStream is returned', async () => {
      const m1: any = {
        mediate: (arg) => Promise.resolve({ type: 'bindings', bindingsStream: true }),
      };
      const m2: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation: m1, mediatorSparqlParse,
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2,
          mediatorSparqlSerializeMediaTypeFormatCombiner: m2, name: 'actor', queryString });
      return expect((await actor.run({ argv: [], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('application/json');
    });

    it('should default to media type application/trig when a quadStream is returned', async () => {
      const m1: any = {
        mediate: (arg) => Promise.resolve({ type: 'quads', quadStream: true }),
      };
      const m2: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation: m1, mediatorSparqlParse,
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2,
          mediatorSparqlSerializeMediaTypeFormatCombiner: m2, name: 'actor', queryString });
      return expect((await actor.run({ argv: [], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('application/trig');
    });

    it('should default to media type simple when a boolean is returned', async () => {
      const m1: any = {
        mediate: (arg) => Promise.resolve({ type: 'boolean', booleanResult: Promise.resolve(true) }),
      };
      const m2: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation: m1, mediatorSparqlParse,
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2,
          mediatorSparqlSerializeMediaTypeFormatCombiner: m2, name: 'actor', queryString });
      return expect((await actor.run({ argv: [], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('simple');
    });

    it('should run for no argv when query is passed as a parameter', () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize, mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize,
          name: 'actor', queryString });
      return actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run for no argv when query and context are passed as a parameter', () => {
      actor = new ActorInitSparql(
        { bus, context, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation,
          mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize, name: 'actor', queryString });
      return actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run to stderr for no argv when only a context is passed as parameter', () => {
      actor = new ActorInitSparql(
        { bus, context, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation,
          mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize, name: 'actor' });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr for no argv when only a falsy query is passed as parameter', () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeFormatCombiner: mediatorSparqlSerialize, name: 'actor', queryString: null });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run with an hypermedia and query from argv', () => {
      return actor.run({ argv: [ hypermedia, queryString ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run to stderr for an hypermedia without a query', () => {
      return expect(actor.run({ argv: [ hypermedia ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should not run for an hypermedia and an invalid query', () => {
      return expect(actor.run({ argv: [ hypermedia, 'INVALID' ], env: {}, stdin: new PassThrough() }))
        .rejects.toBeTruthy();
    });

    it('should run with an hypermedia and query option from argv', () => {
      return actor.run({ argv: [ hypermedia, '-q' , queryString ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run with an hypermedia and a empty query option', () => {
      return expect(actor.run({ argv: [ hypermedia, '-q' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with an hypermedia and query file option from argv', () => {
      return actor.run({ argv: [ hypermedia, '-f' , __dirname + '/assets/all-100.sparql' ], env: {},
        stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with a tagged hypermedia and query file option from argv', () => {
      return actor.run({ argv: [ hypermedia2, '-f' , __dirname + '/assets/all-100.sparql' ], env: {},
        stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with an other source type and query file option from argv', () => {
      return actor.run({ argv: [ otherSource, '-f' , __dirname + '/assets/all-100.sparql' ], env: {},
        stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with multiple hypermedias and a query option', () => {
      return expect(actor.run(
        { argv: [ hypermedia, hypermedia, '-q', queryString ], env: {}, stdin: new PassThrough() }))
        .resolves.toBeTruthy();
    });

    it('should run with multiple tagged hypermedias and a query option', () => {
      return expect(actor.run(
        { argv: [ hypermedia2, hypermedia2, '-q', queryString ], env: {}, stdin: new PassThrough() }))
        .resolves.toBeTruthy();
    });

    it('should not run with an hypermedia and a empty query file option', () => {
      return expect(actor.run({ argv: [ hypermedia, '-f' ], env: {}, stdin: new PassThrough() }))
        .rejects.toBeTruthy();
    });

    it('should not run with an hypermedia and a query file option to an invalid path', () => {
      return expect(actor.run({ argv: [ hypermedia, '-f', __dirname + 'filedoesnotexist.sparql' ], env: {},
        stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with query and a config file option from argv', () => {
      return actor.run({ argv: [ queryString, '-c' , __dirname + '/assets/config.json' ], env: {},
        stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    describe('getScriptOutput', () => {
      it('should return the fallback for a failing command', () => {
        return expect(actor.getScriptOutput('acommandthatdefinitelydoesnotexist', 'fallback'))
          .resolves.toEqual('fallback');
      });
    });

    describe('invalidateHttpCache', () => {
      it('should call the HTTP invalidate mediator', async () => {
        jest.spyOn(mediatorHttpInvalidate, 'mediate');
        await actor.invalidateHttpCache('a');
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ url: 'a' });
      });
    });

    describe('query', () => {
      it('should apply bindings when initialBindings are passed via the context', () => {
        const ctx = { '@comunica/actor-init-sparql:initialBindings': Bindings({ '?s': literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx = { initialBindings: Bindings({ '?s': literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should apply bindings when sources in the old format are passed via the context', () => {
        const ctx = { sources: [] };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow query to be called without context', () => {
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }'))
          .resolves.toBeTruthy();
      });

      it('should allow KEY_CONTEXT_QUERY_TIMESTAMP to be set', () => {
        const ctx = { [KEY_CONTEXT_QUERY_TIMESTAMP]: new Date() };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });

      it('should allow a parsed query to be passd', () => {
        return expect(actor.query(translate('SELECT * WHERE { ?s ?p ?o }')))
          .resolves.toBeTruthy();
      });

      it('should not modify the baseIRI without BASE in query', async () => {
        return expect((await actor.query('SELECT * WHERE { ?s ?p ?o }')).context
          .toJS()['@comunica/actor-init-sparql:baseIRI']).toBeFalsy();
      });

      it('should allow a query to modify the context\'s baseIRI', async () => {
        return expect((await actor.query('BASE <http://example.org/book/> SELECT * WHERE { ?s ?p ?o }')).context.toJS())
          .toMatchObject({
            "@comunica/actor-init-sparql:baseIRI": "myBaseIRI",
          });
      });
    });

    it('should set datetime on the -d option', async () => {
      const dt: Date = new Date();
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
          mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
      return expect((await actor.run({
        argv: [ hypermedia, queryString, '-d', dt.toISOString() ], env: {},
        stdin: new PassThrough(),
      }))).toBeTruthy();
    });

    it('should set logger on the -l option', async () => {
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.context.get(KEY_CONTEXT_LOG) } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
          mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
      return expect((await actor.run({
        argv: [ hypermedia, queryString, '-l', 'warn' ], env: {},
        stdin: new PassThrough(),
      })).stdout).toMatchObject({ level: 'warn' });
    });

    it('should set baseIRI on the -b option', () => {
      const relativeQuery = `
select * where {
graph <exists02.ttl> {
  ?s ?p ex:o1
  filter exists { ?s ?p ex:o2 }
}
`;
      const baseIRI = 'http://example.org';
      return actor.run({ argv: [ hypermedia, '-q' , relativeQuery, '-b', baseIRI ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should set proxy on the -p option', async () => {
      const proxy = 'http://proxy.org/';
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
          mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
      const spy = jest.spyOn(actor, 'query');
      expect((await actor.run({
        argv: [ hypermedia, queryString, '-p', proxy ], env: {},
        stdin: new PassThrough(),
      }))).toBeTruthy();
      expect(spy.mock.calls[0][1]['@comunica/actor-http-proxy:httpProxyHandler'])
        .toEqual(new ProxyHandlerStatic('http://proxy.org/'));
    });

    it('should set leniency on the --lenient flag', async () => {
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
          mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
      const spy = jest.spyOn(actor, 'query');
      expect((await actor.run({
        argv: [ hypermedia, queryString, '--lenient' ], env: {},
        stdin: new PassThrough(),
      }))).toBeTruthy();
      expect(spy.mock.calls[0][1]['@comunica/actor-init-sparql:lenient']).toBeTruthy();
    });

    describe('getResultMediaTypeFormats', () => {
      it('should return the media type formats', () => {
        const med: any = {
          mediate: (arg) => Promise.resolve({ mediaTypeFormats: { data: 'DATA' } }),
        };
        actor = new ActorInitSparql(
          { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
            mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
            mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med,
            mediatorSparqlSerializeMediaTypeFormatCombiner: med, name: 'actor', queryString });
        return expect(actor.getResultMediaTypeFormats(null))
          .resolves.toEqual({ data: 'DATA' });
      });
    });

  });
});
