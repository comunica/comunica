import { Readable } from 'node:stream';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { BindingsStream, IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import {
  ActorQuerySourceIdentifyHypermediaNone,
} from '../lib/ActorQuerySourceIdentifyHypermediaNone';
import '@comunica/jest';

const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');

const mediatorMergeBindingsContext: any = {
  mediate(arg: any) {
    return {};
  },
};

describe('ActorQuerySourceIdentifyHypermediaNone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceIdentifyHypermediaNone instance', () => {
    let actor: ActorQuerySourceIdentifyHypermediaNone;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyHypermediaNone({ name: 'actor', bus, mediatorMergeBindingsContext });
      context = new ActionContext();
    });

    it('should test', async() => {
      await expect(actor.test({ metadata: <any> null, quads: <any> null, url: '', context }))
        .resolves.toEqual({ filterFactor: 0 });
    });

    it('should run', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });
      expect(source.queryBindings).toBeTruthy();
      expect(source.toString()).toBe(`QuerySourceRdfJs(URL)`);
      const stream: BindingsStream = source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext());
      await expect(new Promise((resolve, reject) => {
        stream.getProperty('metadata', resolve);
        stream.on('error', reject);
      })).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 2 },
        canContainUndefs: false,
        availableOrders: undefined,
        order: undefined,
        variables: [ v1, v2, v3 ],
      });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('s1'),
          v2: DF.namedNode('p1'),
          v3: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          v1: DF.namedNode('s2'),
          v2: DF.namedNode('p2'),
          v3: DF.namedNode('o2'),
        }),
      ]);
    });

    it('should run with common variables', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 's2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
      expect(source.queryBindings).toBeTruthy();
      const stream: BindingsStream = source.queryBindings(AF.createPattern(v1, v2, v1), new ActionContext());
      await expect(new Promise((resolve, reject) => {
        stream.getProperty('metadata', resolve);
        stream.on('error', reject);
      })).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
        canContainUndefs: false,
        availableOrders: undefined,
        order: undefined,
        variables: [ v1, v2 ],
      });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('s2'),
          v2: DF.namedNode('p2'),
        }),
      ]);
    });

    it('should run and delegate error events', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      // eslint-disable-next-line no-async-promise-executor,ts/no-misused-promises
      await expect(new Promise(async(resolve, reject) => {
        const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
        (<any> source).source.match = () => {
          const str = new Readable();
          str._read = () => {
            str.emit('error', new Error('Dummy error'));
          };
          return str;
        };
        const stream = source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext());
        stream.on('error', resolve);
        stream.on('data', () => {
          // Do nothing
        });
        stream.on('end', () => reject(new Error('Got no error event.')));
      })).resolves.toEqual(new Error('Dummy error'));
    });
  });
});
