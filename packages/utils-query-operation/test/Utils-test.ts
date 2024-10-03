import { Factory } from 'sparqlalgebrajs';
import {
  assignOperationSource,
  getOperationSource,
  getSafeBindings,
  getSafeBoolean,
  getSafeQuads,
  removeOperationSource,
  validateQueryOutput,
} from '../lib/Utils';

const AF = new Factory();

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
      const op = AF.createNop();
      op.metadata = {};
      expect(getOperationSource(op)).toBeUndefined();
    });

    it('should return for an operation with source', () => {
      const op = AF.createNop();
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
      const opIn = assignOperationSource(AF.createNop(), source1);
      opIn.metadata!.other = true;
      removeOperationSource(opIn);
      const opOut = AF.createNop();
      opOut.metadata = { other: true };
      expect(opIn).toEqual(opOut);
    });
  });
});
