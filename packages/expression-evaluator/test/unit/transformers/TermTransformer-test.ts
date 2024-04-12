import { getMockSuperTypeProvider } from '@comunica/jest';
import { jest } from '@jest/globals';
import { DataFactory } from 'rdf-data-factory';

import { TermTransformer } from '../../../lib';
import { TypeURL as DT } from '../../../lib/util/Consts';

jest.mock('../../../lib/util/Parsing', () => ({
  __esModule: true,
  parseDate() {
    throw new Error('mine');
  },
}));

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('term Tranformer', () => {
  let termTransformer: TermTransformer;
  beforeEach(() => {
    termTransformer = new TermTransformer(getMockSuperTypeProvider());
  });

  const DF = new DataFactory();

  it('Throws non-Expression errors of parsers', () => {
    const lit = DF.literal('apple', DF.namedNode(DT.XSD_DATE));

    expect(() => termTransformer.transformLiteral(lit)).toThrow();

    jest.clearAllMocks();
  });
});
