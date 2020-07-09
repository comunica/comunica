import * as RDF from 'rdf-js';

import { literal } from '@rdfjs/data-model';
import { TypeURL as DT } from '../../lib/util/Consts';
import { orderTypes } from '../../lib/util/Ordering';

function int(value: string): RDF.Literal {
  return literal(value, DT.XSD_INTEGER);
}

function float(value: string): RDF.Literal {
  return literal(value, DT.XSD_FLOAT);
}

function decimal(value: string): RDF.Literal {
  return literal(value, DT.XSD_DECIMAL);
}

function double(value: string): RDF.Literal {
  return literal(value, DT.XSD_DOUBLE);
}

function string(value: string): RDF.Literal {
  return literal(value, DT.XSD_STRING);
}

describe('ordering literals', () => {
  it('undefined passed to ordertypes', () => {
    const numB = int("11");
    expect(orderTypes(undefined, numB, true)).toEqual(0);
    expect(orderTypes(undefined, undefined, true)).toEqual(0);
    expect(orderTypes(numB, undefined, true)).toEqual(0);
  }); 
  it('integers type identical', () => {
      const numA = int("11");
      const numB = int("11");
      expect(orderTypes(numA,numB, true)).toEqual(0);
  });
  it('string type identical', () => {
      const numA = string("11");
      const numB = string("11");
      expect(orderTypes(numA, numB, true)).toEqual(0);
      expect(orderTypes(numB, numA, true)).toEqual(0);
  });
  it('string type comparison', () => {
      const numA = string("11");
      const numB = string("2");
      expect(orderTypes(numA, numB, true)).toEqual(-1);
      expect(orderTypes(numB, numA, true)).toEqual(1);
      expect(orderTypes(numA, numB, false)).toEqual(1);
      expect(orderTypes(numB, numA, false)).toEqual(-1);
  });
  it('integer type comparison', () => {
      const numA = int("11");
      const numB = int("2");
      expect(orderTypes(numA, numB, true)).toEqual(1);
      expect(orderTypes(numB, numA, true)).toEqual(-1);
      expect(orderTypes(numA, numB, false)).toEqual(-1);
      expect(orderTypes(numB, numA, false)).toEqual(1);
  });
  it('double type comparison', () => {
      const numA = double("11");
      const numB = double("2");
      expect(orderTypes(numA, numB, true)).toEqual(1);
      expect(orderTypes(numB, numA, true)).toEqual(-1);
      expect(orderTypes(numA, numB, false)).toEqual(-1);
      expect(orderTypes(numB, numA, false)).toEqual(1);
  });
  it('decimal type comparison', () => {
    const numA = decimal("11");
    const numB = decimal("2");
    expect(orderTypes(numA, numB, true)).toEqual(1);
    expect(orderTypes(numB, numA, true)).toEqual(-1);
    expect(orderTypes(numA, numB, false)).toEqual(-1);
    expect(orderTypes(numB, numA, false)).toEqual(1);
  });
  it('float type comparison', () => {
    const numA = float("11");
    const numB = float("2");
    expect(orderTypes(numA, numB, true)).toEqual(1);
    expect(orderTypes(numB, numA, true)).toEqual(-1);
  });

  it('mixed string integer comparison', () => {
    const numA = string("11");
    const numB = int("2");
    const numD = int("11");
    expect(orderTypes(numA, numB, true)).toEqual(1);
    expect(orderTypes(numB, numA, true)).toEqual(-1);
    expect(orderTypes(numA, numD, true)).toEqual(-1);
  });
});