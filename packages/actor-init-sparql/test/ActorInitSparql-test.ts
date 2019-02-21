import {ActorInit} from "@comunica/bus-init";
import {Bindings} from "@comunica/bus-query-operation";
import {Bus, KEY_CONTEXT_LOG} from "@comunica/core";
import {literal, namedNode, variable} from "@rdfjs/data-model";
import {Factory} from "sparqlalgebrajs";
import {PassThrough, Readable} from "stream";
import {ActorInitSparql} from "../lib/ActorInitSparql";
import {ActorInitSparql as ActorInitSparqlBrowser, KEY_CONTEXT_QUERYFORMAT} from "../lib/ActorInitSparql-browser";

const FACTORY: Factory = new Factory();

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

  describe('#applyInitialBindings', () => {
    it('should filter out project variables that are defined', () => {
      const input = FACTORY.createProject(FACTORY.createBgp([
        FACTORY.createPattern(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
      ]), [ variable('a'), variable('b'), variable('c') ]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({ '?b': literal('bl') }))).toEqual(
        FACTORY.createProject(FACTORY.createBgp([
          FACTORY.createPattern(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
        ]), [ variable('a'), variable('c') ]),
      );
    });

    it('should not change a BGP without variables', () => {
      const input = FACTORY.createBgp([
        FACTORY.createPattern(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
      ]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({}))).toEqual(input);
    });

    it('should not change a BGP with unbound variables', () => {
      const input = FACTORY.createBgp([
        FACTORY.createPattern(variable('s'), variable('p'), variable('o'), variable('g')),
      ]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({
        '?g1': literal('gl'),
        '?o1': literal('ol'),
        '?p1': literal('pl'),
        '?s1': literal('sl'),
      }))).toEqual(input);
    });

    it('should change a BGP with bound variables', () => {
      const input = FACTORY.createBgp([
        FACTORY.createPattern(variable('s'), variable('p'), variable('o'), variable('g')),
      ]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({
        '?g': literal('gl'),
        '?o': literal('ol'),
        '?p': literal('pl'),
        '?s': literal('sl'),
      }))).toEqual(FACTORY.createBgp([
        FACTORY.createPattern(literal('sl'), literal('pl'), literal('ol'), literal('gl')),
      ]));
    });

    it('should not change a path expression without bound variables', () => {
      const input = FACTORY.createPath(variable('s'), FACTORY.createNps([namedNode('p')]),
        variable('o'), variable('g'));
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({
        '?g1': literal('gl'),
        '?o1': literal('ol'),
        '?p1': literal('pl'),
        '?s1': literal('sl'),
      }))).toEqual(FACTORY.createPath(variable('s'), FACTORY.createNps([namedNode('p')]),
        variable('o'), variable('g')));
    });

    it('should change a path expression with bound variables', () => {
      const input = FACTORY.createPath(variable('s'), FACTORY.createNps([namedNode('p')]),
        variable('o'), variable('g'));
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({
        '?g': literal('gl'),
        '?o': literal('ol'),
        '?p': literal('pl'),
        '?s': literal('sl'),
      }))).toEqual(FACTORY.createPath(literal('sl'), FACTORY.createNps([namedNode('p')]),
        literal('ol'), literal('gl')));
    });

    it('should correctly map describe operations', () => {
      const input = FACTORY.createDescribe(FACTORY.createBgp([
        FACTORY.createPattern(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
      ]), [ namedNode('a'), namedNode('b') ]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({}))).toEqual(input);
    });

    it('should correctly map values operations', () => {
      const input = FACTORY.createValues([ variable('a') ], [{ '?a': namedNode('b') }]);
      expect(ActorInitSparql.applyInitialBindings(input, Bindings({}))).toEqual(input);
    });
  });

  describe('An ActorInitSparql instance', () => {
    const hypermedia: string = "http://example.org/";
    const hypermedia2: string = "hypermedia@http://example.org/";
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
      mediatorQueryOperation.mediate = (action) => action.operation.query !== 'INVALID'
        ? Promise.resolve({ bindingsStream: input }) : Promise.reject(new Error('a'));
      mediatorSparqlParse.mediate = (action) => Promise.resolve({ operation: action });
      const defaultQueryInputFormat = 'sparql';
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, defaultQueryInputFormat, logger, mediatorContextPreprocess,
          mediatorHttpInvalidate, mediatorOptimizeQueryOperation, mediatorQueryOperation,
          mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor' });
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
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', queryString });
      const spy = jest.spyOn(actor, 'query');
      (await actor.run({ argv: [], env: {}, stdin: new PassThrough() }));
      return expect(spy.mock.calls[0][1][KEY_CONTEXT_QUERYFORMAT]).toEqual('sparql');
    });

    it('should allow the query format to be changed with -i', async () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize, mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
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
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med, name: 'actor', queryString });
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
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', queryString });
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
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', queryString });
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
          mediatorSparqlSerialize: m2, mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', queryString });
      return expect((await actor.run({ argv: [], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('simple');
    });

    it('should run for no argv when query is passed as a parameter', () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize, mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize,
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
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', queryString });
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
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor' });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr for no argv when only a falsy query is passed as parameter', () => {
      actor = new ActorInitSparql(
        { bus, contextKeyShortcuts, logger, mediatorContextPreprocess, mediatorHttpInvalidate,
          mediatorOptimizeQueryOperation, mediatorQueryOperation, mediatorSparqlParse,
          mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', queryString: null });
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
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ pageUrl: 'a' });
      });
    });

    describe('query', () => {
      it('should apply bindings when initialBindings are passed via the context', () => {
        const ctx = { '@comunica/actor-init-sparql:initialBindings': Bindings({ '?s': literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });
    });

    describe('query', () => {
      it('should apply bindings when initialBindings in the old format are passed via the context', () => {
        const ctx = { initialBindings: Bindings({ '?s': literal('sl') }) };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
      });
    });

    describe('query', () => {
      it('should apply bindings when sources in the old format are passed via the context', () => {
        const ctx = { sources: [] };
        return expect(actor.query('SELECT * WHERE { ?s ?p ?o }', ctx))
          .resolves.toBeTruthy();
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
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med, name: 'actor', queryString });
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
          mediatorSparqlSerialize: med, mediatorSparqlSerializeMediaTypeCombiner: med, name: 'actor', queryString });
      return expect((await actor.run({
        argv: [ hypermedia, queryString, '-l', 'warn' ], env: {},
        stdin: new PassThrough(),
      })).stdout).toMatchObject({ level: 'warn' });
    });

  });
});
