import { Actor, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { ActorAbstractPath } from '../lib/ActorAbstractPath';

const DF = new DataFactory();
const AF = new AlgebraFactory();

describe('ActorAbstractPath', () => {
  const bus = new Bus({ name: 'bus' });
  const factory: AlgebraFactory = new AlgebraFactory();

  describe('The ActorAbstractPath module', () => {
    it('should be a function', () => {
      expect(ActorAbstractPath).toBeInstanceOf(Function);
    });

    it('should be a ActorAbstractPath constructor', () => {
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(ActorAbstractPath);
      expect(new (<any> ActorAbstractPath)({ bus: new Bus({ name: 'bus' }), name: 'actor' }))
        .toBeInstanceOf(Actor);
    });

    it('should not be able to create new ActorAbstractPath objects without \'new\'', () => {
      expect(() => {
        (<any> ActorAbstractPath)();
      }).toThrow(`Class constructor ActorAbstractPath cannot be invoked without 'new'`);
    });
  });

  describe('An ActorAbstractPath instance', () => {
    const actor: ActorAbstractPath = new (<any> ActorAbstractPath)({ bus, name: 'actor' });
    const source1: IQuerySourceWrapper = <any> {};
    const source2: IQuerySourceWrapper = <any> {};

    it('generates unique variable', () => {
      const path = factory.createPath(
        DF.namedNode('s'),
        factory.createLink(DF.namedNode('p')),
        DF.variable('b'),
      );
      expect(termToString(actor.generateVariable(DF, path))).not.toEqual(path.object.value);
    });

    describe('getPathSources', () => {
      it('handles alt', () => {
        expect(actor.getPathSources(AF.createAlt([
          assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
          assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
        ]))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles nested alt', () => {
        expect(actor.getPathSources(AF.createInv(
          AF.createAlt([
            assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
            assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
          ]),
        ))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles seq', () => {
        expect(actor.getPathSources(AF.createSeq([
          assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
          assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
        ]))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles inv', () => {
        expect(actor.getPathSources(AF.createInv(
          assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
        ))).toEqual([
          source1,
        ]);
      });

      it('handles link', () => {
        expect(actor.getPathSources(
          assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
        )).toEqual([
          source1,
        ]);
      });

      it('throws on unknown type', () => {
        const noLink = AF.createLink(DF.namedNode('a'));
        noLink.type = <any> 'unknown type';
        expect(() => actor.getPathSources(
          assignOperationSource(noLink, source1),
        )).toThrow(`Can not extract path sources from operation of type`);
      });

      it('throws on link without source', () => {
        expect(() => actor.getPathSources(
          AF.createLink(DF.namedNode('a')),
        )).toThrow(`Could not find a required source on a link path operation`);
      });
    });

    describe('assignPatternSources', () => {
      it('throws for no sources', () => {
        expect(() => actor.assignPatternSources(AF, <any> AF.createNop(), []))
          .toThrow(new Error(`Attempted to assign zero sources to a pattern during property path handling`));
      });

      it('handles a single source', () => {
        expect(actor.assignPatternSources(
          AF,
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          [ source1 ],
        )).toEqual(assignOperationSource(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          source1,
        ));
      });

      it('handles multiple sources', () => {
        expect(actor.assignPatternSources(
          AF,
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          [ source1, source2 ],
        )).toEqual(AF.createUnion([
          assignOperationSource(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            source1,
          ),
          assignOperationSource(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            source2,
          ),
        ]));
      });
    });
  });
});
