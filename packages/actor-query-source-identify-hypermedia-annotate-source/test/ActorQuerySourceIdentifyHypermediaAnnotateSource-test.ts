import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { DataFactory } from 'rdf-data-factory';
import { streamifyArray } from 'streamify-array';
import {
  ActorQuerySourceIdentifyHypermediaAnnotateSource,
  KEY_CONTEXT_WRAPPED,
} from '../lib/ActorQuerySourceIdentifyHypermediaAnnotateSource';
import '@comunica/utils-jest';
import { mediatorQuerySourceIdentifyHypermedia } from './mediatorQuerySourceIdentify-util';

const quad = require('rdf-quad');

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

describe('ActorQuerySourceIdentifyHypermediaSourceAttribution', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceIdentifyHypermediaAnnotateSource instance', () => {
    let actor: ActorQuerySourceIdentifyHypermediaAnnotateSource;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyHypermediaAnnotateSource(
        { name: 'actor', bus, mediatorMergeBindingsContext, mediatorQuerySourceIdentifyHypermedia },
      );
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    });

    it('should test', async() => {
      await expect(actor.test({ metadata: <any> null, quads: <any> null, url: '', context }))
        .resolves.toPassTest({ filterFactor: Number.POSITIVE_INFINITY });
    });

    it('should run', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });
      expect(source.queryBindings).toBeTruthy();
      const stream: BindingsStream = source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext());
      await expect(new Promise((resolve, reject) => {
        stream.getProperty('metadata', resolve);
        stream.on('error', reject);
      })).resolves.toEqual({
        firstMeta: true,
        state: expect.any(MetadataValidationState),
      });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          s: DF.namedNode('s1'),
          p: DF.namedNode('p1'),
          o: DF.namedNode('o1'),
          g: DF.defaultGraph(),
        }),
        BF.fromRecord({
          s: DF.namedNode('s2'),
          p: DF.namedNode('p2'),
          o: DF.namedNode('o2'),
          g: DF.defaultGraph(),
        }),
      ]);
    });

    it('should run only once', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      context = context.set(KEY_CONTEXT_WRAPPED, true);
      await expect(actor.test({ metadata: <any> null, quads, url: 'URL', context }))
        .resolves
        .toFailTest('Unable to wrap query source multiple times');
    });
  });
});
