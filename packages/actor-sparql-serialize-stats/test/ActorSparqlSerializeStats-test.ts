import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {Readable} from "stream";
import {ActorSparqlSerializeStats} from "../lib/ActorSparqlSerializeStats";
import {ActionObserverHttp} from "..";

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorSparqlSerializeStats', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorSparqlSerializeStats module', () => {
    it('should be a function', () => {
      expect(ActorSparqlSerializeStats).toBeInstanceOf(Function);
    });

    it('should be a ActorSparqlSerializeStats constructor', () => {
      expect(new (<any> ActorSparqlSerializeStats)({ name: 'actor', bus })).toBeInstanceOf(ActorSparqlSerializeStats);
    });

    it('should not be able to create new ActorSparqlSerializeStats objects without \'new\'', () => {
      expect(() => { (<any> ActorSparqlSerializeStats)(); }).toThrow();
    });
  });

  describe('An ActorSparqlSerializeStats instance', () => {
    let httpObserver: ActionObserverHttp;
    let actor: ActorSparqlSerializeStats;
    let bindingsStream: BindingsStream;
    let quadStream;
    let streamError;

    beforeEach(() => {
      httpObserver = new ActionObserverHttp({
        name: 'observer',
        bus,
      });
      actor = new ActorSparqlSerializeStats({
        bus,
        mediaTypes: {
          debug: 1.0,
        },
        name: 'actor',
        httpObserver,
      });

      bindingsStream = new ArrayIterator([
        Bindings({ k1: namedNode('v1'), k2: null }),
        Bindings({ k1: null, k2: namedNode('v2') }),
      ]);
      quadStream = new ArrayIterator([
        quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
        quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
      ]);
      streamError = new Readable();
      streamError._read = () => streamError.emit('error', new Error());
    });
    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true })).resolves.toEqual({ mediaTypes: {
          debug: 1.0,
        }});
      });
    });

    describe('for calculating delay', () => {
      it('should return number greater than 0', () => {
        return expect(actor.delay(process.hrtime())).toBeGreaterThan(0);
      });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        actor.delay = () => 3.14;
      });

      it('should test on table', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'debug' })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', () => {
        return expect(actor.test({ handle: <any> { type: 'quads', quadStream },
          handleMediaType: 'application/n-triples' }))
        .rejects.toBeTruthy();
      });

      it('should not test on unknown types', () => {
        return expect(actor.test(
        { handle: <any> { type: 'unknown' }, handleMediaType: 'debug' }))
        .rejects.toBeTruthy();
      });

      it('should run on a bindings stream', async () => {
        return expect((await stringifyStream((await actor.run(
        {handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'debug'})
        ).handle.data))).toEqual(
        `Result,Delay (ms),HTTP requests
1,3.14,0
2,3.14,0
TOTAL,3.14,0
`);
      });

      it('should run on a bindings stream with http requests', async () => {
        httpObserver.onRun(null, null, null);
        httpObserver.onRun(null, null, null);
        return expect((await stringifyStream((await actor.run(
            {handle: <any> { type: 'bindings', bindingsStream }, handleMediaType: 'debug'})
        ).handle.data))).toEqual(
          `Result,Delay (ms),HTTP requests
1,3.14,2
2,3.14,2
TOTAL,3.14,2
`);
      });

      it('should run on a quad stream', async () => {
        return expect((await stringifyStream((await actor.run(
          { handle: <any> { type: 'quads', quadStream },
            handleMediaType: 'debug' })).handle.data))).toEqual(
        `Result,Delay (ms),HTTP requests
1,3.14,0
2,3.14,0
TOTAL,3.14,0
`);
      });

      it('should emit an error when a bindings stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'bindings', bindingsStream: streamError },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });

      it('should emit an error when a quad stream emits an error', async () => {
        return expect(stringifyStream((await actor.run(
          {handle: <any> { type: 'quads', quadStream: streamError },
            handleMediaType: 'application/json'})).handle.data)).rejects.toBeTruthy();
      });
    });
  });
});
