import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext, ServiceExecutor } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySourceIdentifyServiceExecutor, QuerySourceServiceExecutor } from '..';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorQuerySourceIdentifyServiceExecutor', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQuerySourceIdentifyServiceExecutor module', () => {
    it('should be a function', () => {
      expect(ActorQuerySourceIdentifyServiceExecutor).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyServiceExecutor constructor', () => {
      expect(new (<any> ActorQuerySourceIdentifyServiceExecutor)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentifyServiceExecutor);
      expect(new (<any> ActorQuerySourceIdentifyServiceExecutor)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentify);
    });

    it('should not be able to create new ActorQuerySourceIdentifyServiceExecutor objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQuerySourceIdentifyServiceExecutor)();
      }).toThrow(`Class constructor ActorQuerySourceIdentifyServiceExecutor cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQuerySourceIdentifyServiceExecutor instance', () => {
    let actor: ActorQuerySourceIdentifyServiceExecutor;
    let serviceExecutor: ServiceExecutor;
    let contextEmpty: IActionContext;
    let contextExecutors: IActionContext;
    let contextCreator: IActionContext;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyServiceExecutor({ name: 'actor', bus });
      serviceExecutor = jest.fn();
      contextEmpty = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
      contextExecutors = contextEmpty.set(KeysInitQuery.serviceExecutors, { 'urn:service': serviceExecutor });
      contextCreator = contextEmpty.set(
        KeysInitQuery.serviceExecutorCreator,
        serviceNamedNode => serviceNamedNode.value === 'urn:service' ? serviceExecutor : undefined,
      );
    });

    describe('test', () => {
      it('should not test on a non-IRI value', async() => {
        await expect(actor.test({
          querySourceUnidentified: { value: <any> { match: () => null }},
          context: contextExecutors,
        })).resolves.toFailTest(`actor requires a query source with an IRI value.`);
      });

      it('should not test without custom executors in the context', async() => {
        await expect(actor.test({
          querySourceUnidentified: { value: 'urn:service' },
          context: contextEmpty,
        })).resolves.toFailTest(`actor requires a custom SERVICE executor to be registered for urn:service.`);
      });

      it('should not test on an IRI that is not in the executors dictionary', async() => {
        await expect(actor.test({
          querySourceUnidentified: { value: 'urn:other' },
          context: contextExecutors,
        })).resolves.toFailTest(`actor requires a custom SERVICE executor to be registered for urn:other.`);
      });

      it('should test on an IRI that is in the executors dictionary', async() => {
        const result = await actor.test({
          querySourceUnidentified: { value: 'urn:service' },
          context: contextExecutors,
        });
        expect(result).toPassTestVoid();
        expect(result.getSideData()).toBe(serviceExecutor);
      });

      it('should test on an IRI that is in the executors dictionary, regardless of the source type', async() => {
        const result = await actor.test({
          querySourceUnidentified: { type: 'sparql', value: 'urn:service' },
          context: contextExecutors,
        });
        expect(result).toPassTestVoid();
        expect(result.getSideData()).toBe(serviceExecutor);
      });

      it('should not test on an IRI for which the creator returns undefined', async() => {
        await expect(actor.test({
          querySourceUnidentified: { value: 'urn:other' },
          context: contextCreator,
        })).resolves.toFailTest(`actor requires a custom SERVICE executor to be registered for urn:other.`);
      });

      it('should test on an IRI for which the creator returns an executor', async() => {
        const result = await actor.test({
          querySourceUnidentified: { value: 'urn:service' },
          context: contextCreator,
        });
        expect(result).toPassTestVoid();
        expect(result.getSideData()).toBe(serviceExecutor);
      });

      it('should test on an IRI for which the creator does not return synchronously', async() => {
        const context = contextEmpty.set(KeysInitQuery.serviceExecutorCreator, <any> (async() => serviceExecutor));
        const result = await actor.test({
          querySourceUnidentified: { value: 'urn:service' },
          context,
        });
        expect(result).toPassTestVoid();
        expect(result.getSideData()).toBeInstanceOf(Promise);
      });
    });

    describe('run', () => {
      it('should get the source', async() => {
        const ret = await actor.run({
          querySourceUnidentified: { value: 'urn:service' },
          context: contextExecutors,
        }, serviceExecutor);
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceServiceExecutor);
        expect(ret.querySource.source.referenceValue).toBe('urn:service');
        expect(ret.querySource.context).toEqual(new ActionContext());
      });

      it('should throw when the creator did not return synchronously', async() => {
        await expect(actor.run({
          querySourceUnidentified: { value: 'urn:service' },
          context: contextExecutors,
        }, <any> Promise.resolve(serviceExecutor))).rejects.toThrow(`The serviceExecutorCreator must synchronously return a SERVICE executor or undefined for urn:service, but returned object`);
      });

      it('should get the source with context', async() => {
        const contextSource = new ActionContext({ a: 'b' });
        const ret = await actor.run({
          querySourceUnidentified: { value: 'urn:service', context: contextSource },
          context: contextExecutors,
        }, serviceExecutor);
        expect(ret.querySource.source).toBeInstanceOf(QuerySourceServiceExecutor);
        expect(ret.querySource.context).toBe(contextSource);
      });
    });
  });
});
