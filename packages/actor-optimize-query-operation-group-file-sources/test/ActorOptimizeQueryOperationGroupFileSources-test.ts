import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { ActorOptimizeQueryOperationGroupFileSources } from '../lib/ActorOptimizeQueryOperationGroupFileSources';
import '@comunica/utils-jest';

function createMockSource(filterFactor: number, referenceValue: any = 'http://example.org/source'): IQuerySourceWrapper {
  return <any> {
    source: {
      referenceValue,
      getFilterFactor: jest.fn().mockResolvedValue(filterFactor),
      getSelectorShape: jest.fn(),
      queryBindings: jest.fn(),
      queryQuads: jest.fn(),
      queryBoolean: jest.fn(),
      queryVoid: jest.fn(),
    },
  };
}

describe('ActorOptimizeQueryOperationGroupFileSources', () => {
  let bus: any;
  let mediatorQuerySourceIdentify: any;
  let compositeWrapper: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    compositeWrapper = createMockSource(0, 'http://example.org/file1.ttl\nhttp://example.org/file2.ttl');
    mediatorQuerySourceIdentify = {
      mediate: jest.fn().mockResolvedValue({ querySource: compositeWrapper }),
    };
  });

  describe('An ActorOptimizeQueryOperationGroupFileSources instance', () => {
    let actor: ActorOptimizeQueryOperationGroupFileSources;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationGroupFileSources({
        name: 'actor',
        bus,
        mediatorQuerySourceIdentify,
      });
    });

    describe('test', () => {
      it('should always pass', async() => {
        await expect(actor.test({
          operation: <any> { type: 'nop' },
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });
    });

    describe('run', () => {
      const ctx = new ActionContext();

      it('should not modify context when there are no sources', async() => {
        const opIn = <any> { type: 'nop' };
        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context: ctx });

        expect(operation).toBe(opIn);
        expect(ctxOut).toBe(ctx);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should not modify context when there is only 1 file source', async() => {
        const fileSource = createMockSource(0, 'http://example.org/file1.ttl');
        const context = ctx.set(KeysQueryOperation.querySources, [ fileSource ]);
        const opIn = <any> { type: 'nop' };

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
        expect(ctxOut).toBe(context);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should not modify context when there is only 1 file source among non-file sources', async() => {
        const fileSource = createMockSource(0, 'http://example.org/file1.ttl');
        const sparqlSource = createMockSource(1, 'http://example.org/sparql');
        const querySources = [ fileSource, sparqlSource ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);
        const opIn = <any> { type: 'nop' };

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
        expect(ctxOut.get(KeysQueryOperation.querySources)).toBe(querySources);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should group 2 file sources into a single compositefile source', async() => {
        const fileSource1 = createMockSource(0, 'http://example.org/file1.ttl');
        const fileSource2 = createMockSource(0, 'http://example.org/file2.ttl');
        const querySources = [ fileSource1, fileSource2 ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);
        const opIn = <any> { type: 'nop' };

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);

        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl', 'http://example.org/file2.ttl' ],
          },
          context,
        });

        const newSources = ctxOut.get(KeysQueryOperation.querySources)!;
        expect(newSources).toHaveLength(1);
        expect(newSources).toContain(compositeWrapper);
        expect(newSources).not.toContain(fileSource1);
        expect(newSources).not.toContain(fileSource2);
      });

      it('should group 3 file sources into a single compositefile source', async() => {
        const fileSource1 = createMockSource(0, 'http://example.org/file1.ttl');
        const fileSource2 = createMockSource(0, 'http://example.org/file2.ttl');
        const fileSource3 = createMockSource(0, 'http://example.org/file3.ttl');
        const querySources = [ fileSource1, fileSource2, fileSource3 ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);
        const opIn = <any> { type: 'nop' };

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);

        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [
              'http://example.org/file1.ttl',
              'http://example.org/file2.ttl',
              'http://example.org/file3.ttl',
            ],
          },
          context,
        });

        const newSources = ctxOut.get(KeysQueryOperation.querySources)!;
        expect(newSources).toHaveLength(1);
        expect(newSources).toContain(compositeWrapper);
      });

      it('should group file sources but keep non-file sources', async() => {
        const fileSource1 = createMockSource(0, 'http://example.org/file1.ttl');
        const fileSource2 = createMockSource(0, 'http://example.org/file2.ttl');
        const sparqlSource = createMockSource(1, 'http://example.org/sparql');
        const querySources = [ fileSource1, fileSource2, sparqlSource ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);
        const opIn = <any> { type: 'nop' };

        const { context: ctxOut } = await actor.run({ operation: opIn, context });

        const newSources = ctxOut.get(KeysQueryOperation.querySources)!;
        expect(newSources).toHaveLength(2);
        expect(newSources).toContain(compositeWrapper);
        expect(newSources).toContain(sparqlSource);
        expect(newSources).not.toContain(fileSource1);
        expect(newSources).not.toContain(fileSource2);
      });

      it('should return the operation unchanged', async() => {
        const fileSource1 = createMockSource(0, 'http://example.org/file1.ttl');
        const fileSource2 = createMockSource(0, 'http://example.org/file2.ttl');
        const context = ctx.set(KeysQueryOperation.querySources, [ fileSource1, fileSource2 ]);
        const opIn = <any> { type: 'join', input: []};

        const { operation } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
      });

      it('should call getFilterFactor with the action context', async() => {
        const fileSource1 = createMockSource(0, 'http://example.org/file1.ttl');
        const fileSource2 = createMockSource(0, 'http://example.org/file2.ttl');
        const context = ctx.set(KeysQueryOperation.querySources, [ fileSource1, fileSource2 ]);

        await actor.run({ operation: <any> { type: 'nop' }, context });

        expect(fileSource1.source.getFilterFactor).toHaveBeenCalledWith(context);
        expect(fileSource2.source.getFilterFactor).toHaveBeenCalledWith(context);
      });
    });
  });
});
