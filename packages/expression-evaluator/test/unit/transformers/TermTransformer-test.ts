import { DataFactory } from 'rdf-data-factory';

import { TermTransformer } from '../../../lib/transformers/TermTransformer';
import { TypeURL as DT } from '../../../lib/util/Consts';
import { getDefaultSharedContext } from '../../util/utils';

jest.mock('../../../lib/util/Parsing', () => ({
  __esModule: true,
  parseDate() { throw new Error('mine'); },
}));

describe('term Tranformer', () => {
  let termTransformer: TermTransformer;
  beforeEach(() => {
    termTransformer = new TermTransformer(getDefaultSharedContext().superTypeProvider);
  });

  const DF = new DataFactory();

  it('Throws non-Expression errors of parsers', () => {
    const lit = DF.literal('apple', DF.namedNode(DT.XSD_DATE));

    expect(() => termTransformer.transformLiteral(lit)).toThrow();

    jest.clearAllMocks();
  });
});
