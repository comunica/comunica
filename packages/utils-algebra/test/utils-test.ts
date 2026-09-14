import { Types } from '../lib/Algebra';
import { AlgebraFactory } from '../lib/AlgebraFactory';
import type { AlgebraTransformer } from '../lib/utils';
import { algebraTransformer, transformer } from '../lib/utils';

const AF = new AlgebraFactory();
const DF = AF.dataFactory;

describe('algebraTransformer', () => {
  /**
   * A distinct over a project, with an operation hidden in the metadata of the distinct.
   * Whether that metadata is traversed is decided by the object context,
   * while whether the variables of the project are traversed is decided by its node pre-visitor.
   */
  function createOperation(): any {
    return Object.assign(
      AF.createDistinct(AF.createProject(AF.createNop(), [ DF.variable!('v') ])),
      { metadata: { nested: AF.createNop() }},
    );
  }

  /**
   * The number of NOP operations the given transformer reaches while transforming the given operation.
   */
  function countNops(transformerInstance: AlgebraTransformer<'unsafe', any>, operation: any): number {
    let nops = 0;
    transformerInstance.transformNode(operation, {
      [Types.NOP]: { transform: (nop) => {
        nops++;
        return nop;
      } },
    });
    return nops;
  }

  it('should return the shared transformer when it is not configured.', () => {
    expect(algebraTransformer()).toBe(transformer);
  });

  it('should apply the default object context and node pre-visitors.', () => {
    const operation = createOperation();
    const copy = <any> algebraTransformer().transformNode(operation, {});
    // The metadata is shallowly copied, but the operation inside of it is not traversed
    expect(copy.metadata).not.toBe(operation.metadata);
    expect(copy.metadata.nested).toBe(operation.metadata.nested);
    expect(countNops(algebraTransformer(), operation)).toBe(1);
    // The variables of a project are not traversed
    expect(copy.input.variables).toBe(operation.input.variables);
  });

  it('should apply the default object context when only node pre-visitors are given.', () => {
    const operation = createOperation();
    const custom = algebraTransformer(undefined, { [Types.DISTINCT]: { copy: false }});
    // The operation inside the metadata is still left alone, and the requested pre-visitor is applied
    expect(countNops(custom, operation)).toBe(1);
    expect(custom.transformNode(operation, {})).toBe(operation);
  });

  it('should drop the default object context when it is not requested.', () => {
    const operation = createOperation();
    const custom = algebraTransformer({ useDefaults: false });
    // Without the default object context, the operation inside the metadata is traversed as well
    expect(countNops(custom, operation)).toBe(2);
  });

  it('should drop the default node pre-visitors when they are not requested.', () => {
    const operation = createOperation();
    const custom = algebraTransformer(undefined, { useDefaults: false });
    // Without the default node pre-visitor of the project, its variables are traversed
    const copy = <any> custom.transformNode(operation, {});
    expect(copy.input.variables).not.toBe(operation.input.variables);
  });
});
