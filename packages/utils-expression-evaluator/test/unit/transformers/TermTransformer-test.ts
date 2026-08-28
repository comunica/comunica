import { getMockSuperTypeProvider } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { TermTransformer, TypeURL } from '../../../lib';

describe('Term Transformer', () => {
  let termTransformer: TermTransformer;
  beforeEach(() => {
    termTransformer = new TermTransformer(getMockSuperTypeProvider());
  });

  it('Throws non-Expression errors', () => {
    expect(() => termTransformer.transformLiteral(<RDF.Literal> <any> {
      datatype: { value: TypeURL.XSD_DURATION },
    })).toThrow('Cannot read properties of undefined');
  });
});
