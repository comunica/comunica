import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {PassThrough, Readable} from "stream";
import {ActorInitSparql} from "../lib/ActorInitSparql";

describe('ActorInitSparql', () => {
  let bus;
  let mediatorQueryOperation;
  let mediatorSparqlParse;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {};
    mediatorSparqlParse = {};
  });

  describe('The ActorInitSparql module', () => {
    it('should be a function', () => {
      expect(ActorInitSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorInitSparql constructor', () => {
      expect(new (<any> ActorInitSparql)({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse }))
        .toBeInstanceOf(ActorInitSparql);
      expect(new (<any> ActorInitSparql)({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorInitSparql)(); }).toThrow();
    });
  });

  describe('An ActorInitSparql instance', () => {
    const entrypoint: string = "http://example.org/";
    const query: string = "SELECT * WHERE { ?s ?p ?o } LIMIT 100";
    const context: any = JSON.stringify({ entrypoint });
    let actor: ActorInitSparql;

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push({ a: 'triple' });
        input.push(null);
      };
      mediatorQueryOperation.mediate = (action) => action.operation.query !== 'INVALID'
        ? Promise.resolve({ bindingsStream: input }) : Promise.reject(new Error('a'));
      mediatorSparqlParse.mediate = (action) => Promise.resolve({ operation: action });
      actor = new ActorInitSparql({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse });
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
    });

    it('should not run for no argv', () => {
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run on the -h option', () => {
      return expect(actor.run({ argv: [ '-h' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run on the --help option', () => {
      return expect(actor.run({ argv: [ '--help' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run for no argv when query is passed as a parameter', () => {
      actor = new ActorInitSparql({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, query });
      return actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run for no argv when query and context are passed as a parameter', () => {
      actor = new ActorInitSparql({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, query, context });
      return actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run for no argv when only a context is passed as parameter', () => {
      actor = new ActorInitSparql({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, context });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run for no argv when only a falsy query is passed as parameter', () => {
      actor = new ActorInitSparql({ name: 'actor', bus, mediatorQueryOperation, mediatorSparqlParse, query: null });
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with an entrypoint and query from argv', () => {
      return actor.run({ argv: [ entrypoint, query ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run for an entrypoint without a query', () => {
      return expect(actor.run({ argv: [ entrypoint ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run for an entrypoint and an invalid query', () => {
      return expect(actor.run({ argv: [ entrypoint, 'INVALID' ], env: {}, stdin: new PassThrough() }))
        .rejects.toBeTruthy();
    });

    it('should run with an entrypoint and query option from argv', () => {
      return actor.run({ argv: [ entrypoint, '-q' , query ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run with an entrypoint and a empty query option', () => {
      return expect(actor.run({ argv: [ entrypoint, '-q' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with an entrypoint and query file option from argv', () => {
      return actor.run({ argv: [ entrypoint, '-f' , __dirname + '/assets/all-100.sparql' ], env: {},
        stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with multiple entrypoints and a query option', () => {
      return expect(actor.run({ argv: [ entrypoint, entrypoint, '-q', query ], env: {}, stdin: new PassThrough() }))
        .resolves.toBeTruthy();
    });

    it('should not run with an entrypoint and a empty query file option', () => {
      return expect(actor.run({ argv: [ entrypoint, '-f' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run with an entrypoint and a query file option to an invalid path', () => {
      return expect(actor.run({ argv: [ entrypoint, '-f', __dirname + 'filedoesnotexist.sparql' ], env: {},
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
  });
});
