import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { Actor, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { Factory } from 'sparqlalgebrajs';
import { ActorAbstractPath } from '../lib/ActorAbstractPath';

const DF = new DataFactory();
const AF = new Factory();

describe('ActorAbstractPath', () => {
  const bus = new Bus({ name: 'bus' });
  const factory: Factory = new Factory();

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
      expect(termToString(actor.generateVariable(path))).not.toEqual(path.object.value);
    });

    describe('getPathSources', () => {
      it('handles alt', () => {
        expect(actor.getPathSources(AF.createAlt([
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
        ]))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles nested alt', () => {
        expect(actor.getPathSources(AF.createInv(
          AF.createAlt([
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
            ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
          ]),
        ))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles seq', () => {
        expect(actor.getPathSources(AF.createSeq([
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source2),
        ]))).toEqual([
          source1,
          source2,
        ]);
      });

      it('handles inv', () => {
        expect(actor.getPathSources(AF.createInv(
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
        ))).toEqual([
          source1,
        ]);
      });

      it('handles link', () => {
        expect(actor.getPathSources(
          ActorQueryOperation.assignOperationSource(AF.createLink(DF.namedNode('a')), source1),
        )).toEqual([
          source1,
        ]);
      });

      it('throws on link without source', () => {
        expect(() => actor.getPathSources(
          AF.createLink(DF.namedNode('a')),
        )).toThrow(`Could not find a required source on a link path operation`);
      });
    });

    describe('assignPatternSources', () => {
      it('throws for no sources', () => {
        expect(() => actor.assignPatternSources(<any> AF.createNop(), []))
          .toThrow(new Error(`Attempted to assign zero sources to a pattern during property path handling`));
      });

      it('handles a single source', () => {
        expect(actor.assignPatternSources(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          [ source1 ],
        )).toEqual(ActorQueryOperation.assignOperationSource(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          source1,
        ));
      });

      it('handles multiple sources', () => {
        expect(actor.assignPatternSources(
          AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
          [ source1, source2 ],
        )).toEqual(AF.createUnion([
          ActorQueryOperation.assignOperationSource(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            source1,
          ),
          ActorQueryOperation.assignOperationSource(
            AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
            source2,
          ),
        ]));
      });
    });
  });
});
