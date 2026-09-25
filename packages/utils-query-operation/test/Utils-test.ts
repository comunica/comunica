import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { ServiceExecutor } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import {
  assignOperationSource,
  getOperationSource,
  getSafeBindings,
  getSafeBoolean,
  getSafeQuads,
  getServiceExecutor,
  getServiceExecutorLookup,
  removeOperationSource,
  validateQueryOutput,
} from '../lib/Utils';

const AF = new AlgebraFactory();
const DF = new DataFactory();
const serviceExecutor: ServiceExecutor = async() => [];
const context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });

describe('utils', () => {
  describe('#getSafeBindings', () => {
    it('should return for bindings', () => {
      expect(() => getSafeBindings(<any>{ type: 'bindings' })).not.toThrow();
    });

    it('should error for non-bindings', () => {
      expect(() => getSafeBindings(<any>{ type: 'no-bindings' }))
        .toThrow(`Invalid query output type: Expected 'bindings' but got 'no-bindings'`);
    });
  });

  describe('#getSafeQuads', () => {
    it('should return for quads', () => {
      expect(() => getSafeQuads(<any>{ type: 'quads' })).not.toThrow();
    });

    it('should error for non-quads', () => {
      expect(() => getSafeQuads(<any>{ type: 'no-quads' }))
        .toThrow(`Invalid query output type: Expected 'quads' but got 'no-quads'`);
    });
  });

  describe('#getSafeBoolean', () => {
    it('should return for boolean', () => {
      expect(() => getSafeBoolean(<any>{ type: 'boolean' })).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => getSafeBoolean(<any>{ type: 'no-boolean' }))
        .toThrow(`Invalid query output type: Expected 'boolean' but got 'no-boolean'`);
    });
  });

  describe('#validateQueryOutput', () => {
    it('should return for boolean', () => {
      expect(() => validateQueryOutput(<any>{ type: 'boolean' }, 'boolean')).not.toThrow();
    });

    it('should error for non-boolean', () => {
      expect(() => validateQueryOutput(<any>{ type: 'no-boolean' }, 'boolean'))
        .toThrow(`Invalid query output type: Expected 'boolean' but got 'no-boolean'`);
    });
  });

  describe('#getOperationSource', () => {
    it('should return undefined for an operation without metadata', () => {
      expect(getOperationSource(AF.createNop())).toBeUndefined();
    });

    it('should return undefined for an operation with metadata but without source', () => {
      const op: Algebra.Nop = AF.createNop();
      op.metadata = {};
      expect(getOperationSource(op)).toBeUndefined();
    });

    it('should return for an operation with source', () => {
      const op: Algebra.Nop = AF.createNop();
      op.metadata = { scopedSource: { source: 'abc' }};
      expect(getOperationSource(op)).toEqual({ source: 'abc' });
    });
  });

  describe('#assignOperationSource', () => {
    it('should set the source for an operation', () => {
      const opIn = AF.createNop();
      const source = <any> 'abc';
      const opOut = assignOperationSource(opIn, source);
      expect(getOperationSource(opIn)).toBeUndefined();
      expect(getOperationSource(opOut)).toBe(source);
    });

    it('should override the source for an operation', () => {
      const opIn = AF.createNop();
      const source1 = <any> 'abc';
      const source2 = <any> 'def';
      const opOut1 = assignOperationSource(opIn, source1);
      const opOut2 = assignOperationSource(opOut1, source2);
      expect(getOperationSource(opIn)).toBeUndefined();
      expect(getOperationSource(opOut1)).toBe(source1);
      expect(getOperationSource(opOut2)).toBe(source2);
    });
  });

  describe('#removeOperationSource', () => {
    it('should not modify an operation without source', () => {
      const opIn = AF.createNop();
      removeOperationSource(opIn);
      expect(opIn).toEqual(AF.createNop());
    });

    it('should modify an operation with source', () => {
      const source1 = <any> 'abc';
      const opIn = assignOperationSource(AF.createNop(), source1);
      removeOperationSource(opIn);
      expect(opIn).toEqual(AF.createNop());
    });

    it('should modify an operation with source and other metadata', () => {
      const source1 = <any> 'abc';
      const opIn: Algebra.Nop = assignOperationSource(AF.createNop(), source1);
      opIn.metadata!.other = true;
      removeOperationSource(opIn);
      const opOut: Algebra.Nop = AF.createNop();
      opOut.metadata = { other: true };
      expect(opIn).toEqual(opOut);
    });
  });

  describe('#getServiceExecutorLookup', () => {
    it('should be undefined without custom SERVICE executors', () => {
      expect(getServiceExecutorLookup(context)).toBeUndefined();
    });

    it('should return a lookup function when custom SERVICE executors are configured', () => {
      const contextExecutors = context.set(KeysInitQuery.serviceExecutors, { 'urn:service': serviceExecutor });
      const lookup = getServiceExecutorLookup(contextExecutors)!;
      expect(lookup('urn:service')).toBe(serviceExecutor);
      expect(lookup('urn:other')).toBeUndefined();
    });
  });

  describe('#getServiceExecutor', () => {
    it('should be undefined without custom SERVICE executors', () => {
      expect(getServiceExecutor('urn:service', context)).toBeUndefined();
    });

    it('should obtain executors from the executors dictionary', () => {
      const contextExecutors = context.set(KeysInitQuery.serviceExecutors, { 'urn:service': serviceExecutor });
      expect(getServiceExecutor('urn:service', contextExecutors)).toBe(serviceExecutor);
      expect(getServiceExecutor('urn:other', contextExecutors)).toBeUndefined();
    });

    it('should obtain executors from the executor creator', () => {
      const serviceExecutorCreator = jest.fn((serviceNamedNode: RDF.NamedNode) =>
        serviceNamedNode.value === 'urn:service' ? serviceExecutor : undefined);
      const contextCreator = context.set(KeysInitQuery.serviceExecutorCreator, serviceExecutorCreator);
      expect(getServiceExecutor('urn:service', contextCreator)).toBe(serviceExecutor);
      expect(getServiceExecutor('urn:other', contextCreator)).toBeUndefined();
      expect(serviceExecutorCreator).toHaveBeenCalledWith(DF.namedNode('urn:service'));
    });

    it('should throw when both custom SERVICE executors and an executor creator are configured', () => {
      const contextBoth = context
        .set(KeysInitQuery.serviceExecutors, { 'urn:service': serviceExecutor })
        .set(KeysInitQuery.serviceExecutorCreator, () => serviceExecutor);
      expect(() => getServiceExecutor('urn:service', contextBoth))
        .toThrow('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
    });
  });
});
