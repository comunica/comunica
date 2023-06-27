import { Readable } from 'stream';
import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfResolveHypermediaNone } from '../lib/ActorRdfResolveHypermediaNone';

const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const v = DF.variable('v');

describe('ActorRdfResolveHypermediaNone', () => {
  let bus: any;

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
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaNone({ name: 'actor', bus });
      context = new ActionContext();
    });

    it('should test', () => {
      return expect(actor.test({ metadata: <any> null, quads: <any> null, url: '', context }))
        .resolves.toEqual({ filterFactor: 0 });
    });

    it('should run', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
      expect(source.match).toBeTruthy();
      let stream: AsyncIterator<RDF.Quad>;
      await expect(new Promise((resolve, reject) => {
        stream = source.match(v, v, v, v);
        stream.getProperty('metadata', resolve);
      })).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
      });
      expect(await arrayifyStream(stream!)).toEqualRdfQuadArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should run and delegate error events', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      await expect(new Promise(async(resolve, reject) => {
        const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
        (<any> source).source.match = () => {
          const str = new Readable();
          str._read = () => {
            str.emit('error', new Error('Dummy error'));
          };
          return str;
        };
        const stream = source.match(v, v, v, v);
        stream.on('error', resolve);
        stream.on('data', () => {
          // Do nothing
        });
        stream.on('end', () => reject(new Error('Got no error event.')));
      })).resolves.toEqual(new Error('Dummy error'));
    });
  });
});
