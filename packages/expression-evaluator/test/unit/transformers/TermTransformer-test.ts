import { DataFactory } from 'rdf-data-factory';

import { TermTransformer } from '../../../lib/transformers/TermTransformer';
import { TypeURL as DT } from '../../../lib/util/Consts';
import { getDefaultSharedContext } from '../../util/utils';
import * as parsing from '../../../lib/util/Parsing';

describe('term Tranformer', () => {
  let termTransformer: TermTransformer;
  beforeEach(() => {
    termTransformer = new TermTransformer(getDefaultSharedContext().superTypeProvider);
  });

  const DF = new DataFactory();

  it('Throws non-Expression errors of parsers', () => {
    const lit = DF.literal('apple', DF.namedNode(DT.XSD_DATE));
    const spy = jest.spyOn(parsing, 'parseDate');
    spy.mockImplementation(() => { throw new Error('mine') });

    expect(() => termTransformer.transformLiteral(lit)).toThrow('mine');
    expect(spy).toHaveBeenCalledWith("apple");

    jest.clearAllMocks();
  });
});
