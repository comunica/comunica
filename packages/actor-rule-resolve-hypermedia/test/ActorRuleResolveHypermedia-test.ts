import { ActionContext, Bus } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import { mediatorDereferenceRule } from '@comunica/reasoning-mocks';
import type { IActionContext } from '@comunica/types';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import
import { ActorRuleResolveHypermedia } from '../lib';
import { MediatedRuleSource } from '../lib/MediatedRuleSource';

describe('ActorRuleResolveHypermedia', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRuleResolveHypermedia module', () => {
    it('should be a function', () => {
      expect(ActorRuleResolveHypermedia).toBeInstanceOf(Function);
    });

    it('should be a ActorRuleResolveHypermedia constructor', () => {
      expect(new (<any> ActorRuleResolveHypermedia)({
        bus,
        mediatorDereferenceRule,
      })).toBeInstanceOf(ActorRuleResolveHypermedia);
    });

    it('should be a ActorRuleResolveHypermedia constructor constructable with cache', () => {
      let listener = null;
      const httpInvalidator = {
        addInvalidateListener: (l: any) => listener = l,
      };
      expect(new (<any> ActorRuleResolveHypermedia)({
        bus: new Bus({ name: 'bus' }),
        cacheSize: 10,
        httpInvalidator,
        mediatorDereferenceRule,
      })).toBeInstanceOf(ActorRuleResolveHypermedia);
      expect(listener).toBeTruthy();
    });

    it('should not be able to create new ActorRuleResolveHypermedia objects without \'new\'', () => {
      expect(() => { (<any> ActorRuleResolveHypermedia)(); }).toThrow();
    });
  });

  describe('An ActorRuleResolveHypermedia instance', () => {
    let actor: any;
    let context: IActionContext;
    let pattern: any;
    let httpInvalidator: any;
    let listener: any;

    beforeEach(() => {
      httpInvalidator = {
        addInvalidateListener: (l: any) => listener = l,
      };
      actor = new ActorRuleResolveHypermedia({
        bus: new Bus({ name: 'bus' }),
        cacheSize: 10,
        httpInvalidator,
        mediatorDereferenceRule,
        name: 'actor',
      });
      context = new ActionContext({ [KeysRdfReason.rules.name]: 'my-unnested-rules' });
    });

    describe('test', () => {
      it('should test', () => {
        return expect(actor.test({ context }))
          .resolves.toBeTruthy();
      });

      //   It('should test on raw source form', () => {
      //     return expect(actor.test({
      //       context: new ActionContext(
      //         { [KeysRdfReason.rules.name]: 'abc' },
      //       ) }))
      //       .resolves.toBeTruthy();
      //   });

      //   it('should not test without a context', () => {
      //     return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
      //   });

      //   it('should not test without a file', () => {
      //     return expect(actor.test({ pattern: null, context: new ActionContext({}) })).rejects.toBeTruthy();
      //   });

      //   it('should not test on an invalid value', () => {
      //     return expect(actor.test({ pattern: null,
      //       context: new ActionContext(
      //         { [KeysRdfReason.rules.name]: { value: null }},
      //       ) }))
      //       .rejects.toBeTruthy();
      //   });

      //   it('should not test on no sources', () => {
      //     return expect(actor.test({ pattern: null,
      //       context: new ActionContext(
      //         { '@comunica/bus-rdf-resolve-quad-pattern:sources': []},
      //       ) }))
      //       .rejects.toBeTruthy();
      //   });

      //   it('should not test on multiple sources', () => {
      //     return expect(actor.test(
      //       { pattern: null,
      //         context: new ActionContext(
      //           { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ value: 'a' }, { value: 'b' }]},
      //         ) },
      //     ))
      //       .rejects.toBeTruthy();
      //   });
      // });

      describe('getSource', () => {
        it('should return a MediatedRuleSource', async() => {
          expect(await actor.getSource(context)).toBeInstanceOf(MediatedRuleSource);
        });

        it('should cache the source', async() => {
          const source1 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern);
          const source2 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).toBe(source2);
        });

        it('should cache the source and allow invalidation for a specific url', async() => {
          const source1 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern);
          const source2 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).toBe(source2);

          listener({ url: 'my-unnested-rules' });

          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).not.toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).toBe(source2);
        });

        it('should cache the source and allow invalidation for all urls', async() => {
          const source1 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern);
          const source2 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).toBe(source2);

          listener({});

          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).not.toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).not.toBe(source2);
        });

        it('should not cache the source with cache size 0', async() => {
          actor = new ActorRuleResolveHypermedia({
            bus: new Bus({ name: 'bus' }),
            cacheSize: 0,
            httpInvalidator,
            mediatorDereferenceRule,
            name: 'actor',
          });

          const source1 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern);
          const source2 = await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-unnested-rules' },
          ), pattern)).not.toBe(source1);
          expect(await actor.getSource(new ActionContext(
            { [KeysRdfReason.rules.name]: 'my-nested-rules' },
          ), pattern)).not.toBe(source2);
        });
      });

      describe('run', () => {
        it('should return a rule stream', async() => {
          const { data } = await actor.run({ context });
          expect(await data.toArray()).toHaveLength(2);
        });

        it('Should error if context does not have a rule reference', async() => {
          await expect(() => actor.run({ context: new ActionContext({}) })).rejects.toThrow();
        });

      // It('should return a quad stream and metadata, with metadata resolving first', async() => {
      //   const { data } = await actor.run({ context, pattern });
      //   expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
      //     .toEqual({ firstMeta: true, a: 1 });
      //   expect(await data.toArray()).toEqualRdfQuadArray([
      //     quad('s1', 'p1', 'o1'),
      //     quad('s2', 'p2', 'o2'),
      //     quad('s3', 'p3', 'o3'),
      //     quad('s4', 'p4', 'o4'),
      //   ]);
      });
    });
  });
});
