import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {PassThrough, Readable} from "stream";
import {ActorInitSparql} from "../lib/ActorInitSparql";
import {ActorInitSparql as ActorInitSparqlBrowser} from "../lib/ActorInitSparql-browser";

describe('ActorInitSparqlBrowser', () => {
  it('should not allow invoking its run method', () => {
    return expect(new (<any> ActorInitSparqlBrowser)({ bus: new Bus({ name: 'bus' }) }).run()).rejects.toBeTruthy();
  });
});

describe('ActorInitSparql', () => {
  let bus;
  let mediatorQueryOperation;
  let mediatorSparqlParse;
  let mediatorSparqlSerialize;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
    mediatorSparqlSerialize = {
      mediate: (arg) => Promise.resolve(arg.mediaTypes ? { mediaTypes: arg }
      : { handle: { data: arg.handle.bindingsStream } }),
    };
  });

  describe('The ActorInitSparql module', () => {
    it('should be a function', () => {
      expect(ActorInitSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorInitSparql constructor', () => {
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize }))
        .toBeInstanceOf(ActorInitSparql);
      expect(new (<any> ActorInitSparql)(
        { name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorInitSparql)(); }).toThrow();
    });
  });

  describe('An ActorInitSparql instance', () => {
    const hypermedia: string = "http://example.org/";
    const hypermedia2: string = "hypermedia@http://example.org/";
    const query: string = "SELECT * WHERE { ?s ?p ?o } LIMIT 100";
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
      actor = new ActorInitSparql(
        { bus, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
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

    it('should allow a media type to be passed with -t', async () => {
      const med: any = {
        mediate: (arg) => Promise.resolve({ handle: { data: arg.handleMediaType } }),
      };
      actor = new ActorInitSparql(
        { bus, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize: med,
          mediatorSparqlSerializeMediaTypeCombiner: med, name: 'actor', query });
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
        { bus, mediatorContextPreprocess, mediatorQueryOperation: m1, mediatorSparqlParse, mediatorSparqlSerialize: m2,
          mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', query });
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
        { bus, mediatorContextPreprocess, mediatorQueryOperation: m1, mediatorSparqlParse, mediatorSparqlSerialize: m2,
          mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', query });
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
        { bus, mediatorContextPreprocess, mediatorQueryOperation: m1, mediatorSparqlParse, mediatorSparqlSerialize: m2,
          mediatorSparqlSerializeMediaTypeCombiner: m2, name: 'actor', query });
      return expect((await actor.run({ argv: [], env: {}, stdin: new PassThrough() })).stdout)
        .toEqual('simple');
    });

    it('should run for no argv when query is passed as a parameter', () => {
      actor = new ActorInitSparql(
        { bus, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', query });
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
        { bus, context, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', query });
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
        { bus, context, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor' });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run to stderr for no argv when only a falsy query is passed as parameter', () => {
      actor = new ActorInitSparql(
        { bus, mediatorContextPreprocess, mediatorQueryOperation, mediatorSparqlParse, mediatorSparqlSerialize,
          mediatorSparqlSerializeMediaTypeCombiner: mediatorSparqlSerialize, name: 'actor', query: null });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).resolves
        .toHaveProperty('stderr');
    });

    it('should run with an hypermedia and query from argv', () => {
      return actor.run({ argv: [ hypermedia, query ], env: {}, stdin: new PassThrough() })
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
      return actor.run({ argv: [ hypermedia, '-q' , query ], env: {}, stdin: new PassThrough() })
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
      return expect(actor.run({ argv: [ hypermedia, hypermedia, '-q', query ], env: {}, stdin: new PassThrough() }))
        .resolves.toBeTruthy();
    });

    it('should run with multiple tagged hypermedias and a query option', () => {
      return expect(actor.run({ argv: [ hypermedia2, hypermedia2, '-q', query ], env: {}, stdin: new PassThrough() }))
        .resolves.toBeTruthy();
    });

    it('should not run with an hypermedia and a empty query file option', () => {
      return expect(actor.run({ argv: [ hypermedia, '-f' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run with an hypermedia and a query file option to an invalid path', () => {
      return expect(actor.run({ argv: [ hypermedia, '-f', __dirname + 'filedoesnotexist.sparql' ], env: {},
        stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with query and a config file option from argv', () => {
      return actor.run({ argv: [ query, '-c' , __dirname + '/assets/config.json' ], env: {},
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
  });
});
