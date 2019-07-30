import {ActorRdfResolveHypermedia} from "@comunica/bus-rdf-resolve-hypermedia";
import {Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfResolveHypermediaNone} from "../lib/ActorRdfResolveHypermediaNone";

const streamifyArray = require('streamify-array');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorRdfResolveHypermediaNone', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveHypermediaNone module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveHypermediaNone).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveHypermediaNone constructor', () => {
      expect(new (<any> ActorRdfResolveHypermediaNone)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermediaNone);
      expect(new (<any> ActorRdfResolveHypermediaNone)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermedia);
    });

    it('should not be able to create new ActorRdfResolveHypermediaNone objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveHypermediaNone)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveHypermediaNone instance', () => {
    let actor: ActorRdfResolveHypermediaNone;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaNone({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ metadata: null, quads: null, url: '' })).resolves.toEqual({ filterFactor: 0 });
    });

    it('should run', async () => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      const { source } = await actor.run({ metadata: null, quads, url: '' });
      expect(source.match).toBeTruthy();
      await expect(new Promise((resolve, reject) => {
        const stream = source.match();
        stream.on('metadata', resolve);
        stream.on('data', () => { return; });
        stream.on('end', () => reject(new Error('Got end event before metadata event.')));
      })).resolves.toEqual({ totalItems: 2 });
      expect(await arrayifyStream(source.match())).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should run and delegate error events', async () => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      await expect(new Promise(async (resolve, reject) => {
        const { source } = await actor.run({ metadata: null, quads, url: '' });
        (<any> source).source.match = () => {
          const str = new Readable();
          str._read = () => {
            str.emit('error', new Error('Dummy error'));
          };
          return str;
        };
        const stream = source.match();
        stream.on('error', resolve);
        stream.on('data', () => { return; });
        stream.on('end', () => reject(new Error('Got no error event.')));
      })).resolves.toEqual(new Error('Dummy error'));
    });
  });
});
