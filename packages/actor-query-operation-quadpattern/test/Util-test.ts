import '@comunica/jest';
import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { getElementVariables, getQuadBindings, type INestedElementVariables } from '../lib/Util';

const DF = new DataFactory();
const DF_BaseQuad = new DataFactory<RDF.BaseQuad>();
const BF = new BindingsFactory();

describe('Util', () => {
  describe('getElementVariables', () => {
    it('should return undefined with no variables and no nested quads', () => {
      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      ))).toBeUndefined();

      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('g'),
      ))).toBeUndefined();
    });

    it('should return relevant variables and no nested quads', () => {
      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      ))).toEqual({ elementVariables: { subject: 's' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.variable('o'),
      ))).toEqual({ elementVariables: { object: 'o' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
      ))).toEqual({ elementVariables: { subject: 's', object: 'o' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('g'),
      ))).toEqual({ elementVariables: { subject: 's' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.namedNode('g'),
      ))).toEqual({ elementVariables: { object: 'o' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.namedNode('g'),
      ))).toEqual({ elementVariables: { subject: 's', object: 'o' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      ))).toEqual({ elementVariables: { subject: 's', graph: 'g' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.variable('g'),
      ))).toEqual({ elementVariables: { object: 'o', graph: 'g' }, nestedVariables: undefined });

      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.variable('o'),
        DF.variable('g'),
      ))).toEqual({ elementVariables: { subject: 's', object: 'o', graph: 'g' }, nestedVariables: undefined });
    });

    // TODO: Properly test this nested case with graphs
    it('should be able to extract nested variables', () => {
      expect(getElementVariables(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.variable('s1'),
          DF.namedNode('p1'),
          DF.variable('o1'),
        ),
      ))).toEqual({
        elementVariables: { subject: 's' },
        nestedVariables: {
          object: {
            elementVariables: { subject: 's1', object: 'o1' },
            nestedVariables: undefined,
          },
        },
      });
    });

    it('should return undefined with no variables and nested quads', () => {
      expect(getElementVariables(DF.quad(
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('p'),
        DF.namedNode('o'),
      ))).toBeUndefined();

      expect(getElementVariables(DF_BaseQuad.quad(
        DF.namedNode('s'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('o'),
      ))).toBeUndefined();

      expect(getElementVariables(DF_BaseQuad.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      ))).toBeUndefined();

      expect(getElementVariables(DF.quad(
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.namedNode('g'),
      ))).toBeUndefined();

      expect(getElementVariables(DF_BaseQuad.quad(
        DF.namedNode('s'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('o'),
        DF.namedNode('g'),
      ))).toBeUndefined();

      expect(getElementVariables(DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('g'),
      ))).toBeUndefined();

      expect(getElementVariables(DF_BaseQuad.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      ))).toBeUndefined();

      expect(getElementVariables(DF.quad(
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
        DF.namedNode('g'),
      ))).toBeUndefined();
    });
  });

  describe('getQuadBindings', () => {
    it('should extract basic variable', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: { subject: '?s' },
      };

      expect(getQuadBindings(quad, nestedElement)).toEqual(BF.bindings([[ DF.variable('?s'), DF.namedNode('s') ]]));
    });

    it('should extract basic variables', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: { subject: '?s', object: 'o' },
      };

      expect(getQuadBindings(quad, nestedElement)).toEqual(BF.bindings([
        [ DF.variable('?s'), DF.namedNode('s') ],
        [ DF.variable('o'), DF.namedNode('o') ],
      ]));
    });

    it('should throw an error when nested quad is expected but not provided', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.namedNode('o'),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: {},
        nestedVariables: {
          subject: {
            elementVariables: { object: 'o', graph: 'g' },
          },
        },
      };

      expect(() => getQuadBindings(quad, nestedElement)).toThrowError();
    });

    it('should throw an error when nested quad is expected but not provided in correct position', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: {},
        nestedVariables: {
          subject: {
            elementVariables: { object: 'o' },
          },
        },
      };

      expect(() => getQuadBindings(quad, nestedElement)).toThrowError();
    });

    it('should correctly extract nested variable', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: {},
        nestedVariables: {
          object: {
            elementVariables: { object: 'o' },
          },
        },
      };

      expect(getQuadBindings(quad, nestedElement)).toEqual(BF.bindings([
        [ DF.variable('o'), DF.namedNode('o1') ],
      ]));
    });

    it('should correctly extract nested variable and upper level variables', () => {
      const quad = DF.quad(
        DF.namedNode('s'),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: {
          subject: '?sv',
        },
        nestedVariables: {
          object: {
            elementVariables: { object: 'o' },
          },
        },
      };

      expect(getQuadBindings(quad, nestedElement)).toEqual(BF.bindings([
        [ DF.variable('?sv'), DF.namedNode('s') ],
        [ DF.variable('o'), DF.namedNode('o1') ],
      ]));
    });

    it('should correctly extract deeply nested variable and upper level variables', () => {
      const quad = DF.quad(
        DF.quad(
          DF.namedNode('s2i'),
          DF.namedNode('p2i'),
          DF.quad(
            DF.namedNode('s2'),
            DF.namedNode('p2'),
            DF.namedNode('o2'),
          ),
        ),
        DF.namedNode('p'),
        DF.quad(
          DF.namedNode('s1'),
          DF.namedNode('p1'),
          DF.namedNode('o1'),
        ),
      );

      const nestedElement: INestedElementVariables = {
        elementVariables: {
          predicate: '?sv',
        },
        nestedVariables: {
          object: {
            elementVariables: { object: 'o' },
          },
          subject: {
            nestedVariables: {
              object: {
                elementVariables: { object: 'o2v' },
              },
            },
          },
        },
      };

      expect(getQuadBindings(quad, nestedElement)).toEqual(BF.bindings([
        [ DF.variable('o2v'), DF.namedNode('o2') ],
        [ DF.variable('?sv'), DF.namedNode('p') ],
        [ DF.variable('o'), DF.namedNode('o1') ],
      ]));
    });
  });
});
