import {ActorRdfParseN3} from "@comunica/actor-rdf-parse-n3";
import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {MediatorRace} from "@comunica/mediator-race";
import {Readable} from "stream";
import {ActorInitRdfParse} from "../lib/ActorInitRdfParse";
const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');

describe('ActorInitRdfParse', () => {
  let bus;
  let busInit;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    busInit = new Bus({ name: 'bus-init' });
    mediator = new MediatorRace({ name: 'mediator', bus: busInit });
  });

  describe('The ActorInitRdfParse module', () => {
    it('should be a function', () => {
      expect(ActorInitRdfParse).toBeInstanceOf(Function);
    });

    it('should be a ActorInitRdfParse constructor', () => {
      expect(new (<any> ActorInitRdfParse)({ name: 'actor', bus, mediatorRdfParse: mediator, mediaType: 'abc' }))
        .toBeInstanceOf(ActorInitRdfParse);
      expect(new (<any> ActorInitRdfParse)({ name: 'actor', bus, mediatorRdfParse: mediator, mediaType: 'abc' }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitRdfParse objects without \'new\'', () => {
      expect(() => { (<any> ActorInitRdfParse)(); }).toThrow();
    });

    it('should store the \'mediatorRdfParse\' parameter', () => {
      expect(new ActorInitRdfParse({ name: 'actor', bus, mediatorRdfParse: mediator, mediaType: 'abc' })
        .mediatorRdfParse).toEqual(mediator);
    });

    it('should store the \'mediaType\' parameter', () => {
      expect(new ActorInitRdfParse({ name: 'actor', bus, mediatorRdfParse: mediator, mediaType: 'abc' })
        .mediaType).toEqual('abc');
    });
  });

  describe('An ActorInitRdfParse instance', () => {
    let actor: ActorInitRdfParse;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorInitRdfParse({ name: 'actor', bus, mediatorRdfParse: mediator, mediaType: 'text/turtle' });
      busInit.subscribe(new ActorRdfParseN3({ bus, mediaTypes: {
        'application/trig': 1.0,
        'application/n-quads': 0.7, // tslint:disable-line:object-literal-sort-keys // We want to sort by preference
        'text/turtle': 0.6,
        'application/n-triples': 0.3,
        'text/n3': 0.2,
      }, name: 'actor-rdf-parse' }));
      input = stringToStream(`
      <a> <b> <c>.
      <d> <e> <f> <g>.
      `);
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: input })).resolves.toBe(null);
    });

    it('should run', () => {
      return expect(actor.run({ argv: [ 'text/turtle' ], env: {}, stdin: input })).resolves
        .toHaveProperty('stdout');
    });

    it('should run without argv', () => {
      return expect(actor.run({ argv: [], env: {}, stdin: input })).resolves
        .toHaveProperty('stdout');
    });

    it('should run', () => {
      return actor.run({ argv: [ 'text/turtle' ], env: {}, stdin: input })
        .then(async (output) => {
          return expect(await arrayifyStream(output.stdout)).toBeTruthy();
        });
    });

    it('should run', () => {
      return actor.run({ argv: [ 'text/turtle', 'x:' ], env: {}, stdin: input })
        .then(async (output) => {
          return expect((await arrayifyStream(output.stdout)).map((b) => JSON.parse(b.toString()))).toEqual([
            { subject: 'x:a', predicate: 'x:b', object: 'x:c', graph: ''},
            { subject: 'x:d', predicate: 'x:e', object: 'x:f', graph: 'x:g'},
          ]);
        });
    });
  });
});
