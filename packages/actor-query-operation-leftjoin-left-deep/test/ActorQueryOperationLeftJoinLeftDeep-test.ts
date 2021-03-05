import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { ActionContext, Bus } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { ArrayIterator, EmptyIterator, SingletonIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string';
import { forEachTerms } from 'rdf-terms';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperationLeftJoinLeftDeep } from '../lib/ActorQueryOperationLeftJoinLeftDeep';

const arrayifyStream = require('arrayify-stream');
const factory = new Factory();
const DF = new DataFactory();

describe('ActorQueryOperationLeftJoinLeftDeep', () => {
  let bus: any;
  let mediatorQueryOperation: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate(arg: any) {
        let filter = false;
        if (arg.operation.type === 'filter') {
          filter = true;
          arg.operation = arg.operation.input;
        }

        const bindings: any = {};
        let amount = 1;
        forEachTerms(arg.operation, term => {
          if (term.termType === 'Variable') {
            if (term.value.startsWith('+')) {
              amount = 2;
            } else if (term.value.startsWith('-')) {
              amount = 0;
            }
            bindings[termToString(term)] = DF.namedNode(`bound-${term.value}${filter ? '-FILTERED' : ''}`);
          }
        });

        let bindingsStream;
        if (amount === 0) {
          bindingsStream = new EmptyIterator();
        } else if (amount === 1) {
          bindingsStream = new SingletonIterator(Bindings(bindings));
        } else {
          bindingsStream = new ArrayIterator([
            Bindings(bindings).map((v: RDF.Term) => DF.namedNode(`${v.value}1`)),
            Bindings(bindings).map((v: RDF.Term) => DF.namedNode(`${v.value}2`)),
          ]);
        }

        return Promise.resolve({
          bindingsStream,
          metadata: () => arg.operation.rejectMetadata ?
            Promise.reject(new Error('fail')) :
            Promise.resolve({ totalItems: (arg.context || ActionContext({})).get('totalItems') }),
          type: 'bindings',
          variables: (arg.context || ActionContext({})).get('variables') || [],
          canContainUndefs: false,
        });
      },
    };
  });

  describe('The ActorQueryOperationLeftJoinLeftDeep module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationLeftJoinLeftDeep).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationLeftJoinLeftDeep constructor', () => {
      expect(new (<any> ActorQueryOperationLeftJoinLeftDeep)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationLeftJoinLeftDeep);
      expect(new (<any> ActorQueryOperationLeftJoinLeftDeep)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationLeftJoinLeftDeep objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationLeftJoinLeftDeep)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationLeftJoinLeftDeep instance', () => {
    let actor: ActorQueryOperationLeftJoinLeftDeep;

    beforeEach(() => {
      actor = new ActorQueryOperationLeftJoinLeftDeep({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on leftjoin', () => {
      const op = { operation: { type: 'leftjoin' }};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-leftjoin', () => {
      const op = { operation: { type: 'some-other-type' }};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run for one binding in left and right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': DF.namedNode('bound-a'),
            '?b': DF.namedNode('bound-b'),
          }),
        ]);
      });
    });

    it('should run for multiple bindings in left and one binding in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': DF.namedNode('bound-+a1'),
            '?b': DF.namedNode('bound-b'),
          }),
          Bindings({
            '?+a': DF.namedNode('bound-+a2'),
            '?b': DF.namedNode('bound-b'),
          }),
        ]);
      });
    });

    it('should run for one binding in left and multiple bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('a'), DF.variable('+b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': DF.namedNode('bound-a'),
            '?+b': DF.namedNode('bound-+b1'),
          }),
          Bindings({
            '?a': DF.namedNode('bound-a'),
            '?+b': DF.namedNode('bound-+b2'),
          }),
        ]);
      });
    });

    it('should run for multiple binding in left and multiple bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('+b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': DF.namedNode('bound-+a1'),
            '?+b': DF.namedNode('bound-+b1'),
          }),
          Bindings({
            '?+a': DF.namedNode('bound-+a1'),
            '?+b': DF.namedNode('bound-+b2'),
          }),
          Bindings({
            '?+a': DF.namedNode('bound-+a2'),
            '?+b': DF.namedNode('bound-+b1'),
          }),
          Bindings({
            '?+a': DF.namedNode('bound-+a2'),
            '?+b': DF.namedNode('bound-+b2'),
          }),
        ]);
      });
    });

    it('should run for one binding in left and no bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('a'), DF.variable('-b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': DF.namedNode('bound-a'),
          }),
        ]);
      });
    });

    it('should run for multiple bindings in left and no bindings in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('-b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?+a': DF.namedNode('bound-+a1'),
          }),
          Bindings({
            '?+a': DF.namedNode('bound-+a2'),
          }),
        ]);
      });
    });

    it('should correctly handle rejecting metadata in left', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('-b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      operation.left.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should correctly handle rejecting metadata in right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('-b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      operation.right.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should correctly handle rejecting metadata in left and right', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('+a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('+a'), DF.variable('-b'), DF.namedNode('2'), DF.namedNode('b')),
      );
      operation.left.rejectMetadata = true;
      operation.right.rejectMetadata = true;
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: Number.POSITIVE_INFINITY });
      });
    });

    it('should run for one binding in left and right with an expression', () => {
      const operation = factory.createLeftJoin(
        factory.createPattern(DF.variable('a'), DF.namedNode('1'), DF.namedNode('1'), DF.namedNode('1')),
        factory.createPattern(DF.variable('a'), DF.variable('b'), DF.namedNode('2'), DF.namedNode('b')),
        factory.createTermExpression(DF.namedNode('EXPRESSION')),
      );
      const op = { operation, context: ActionContext({ totalItems: 10, variables: [ 'a' ]}) };
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(output.variables).toEqual([ 'a' ]);
        expect(output.type).toEqual('bindings');
        expect(await (<any> output).metadata()).toEqual({ totalItems: 100 });
        expect(output.canContainUndefs).toEqual(true);
        expect(await arrayifyStream(output.bindingsStream)).toEqual([
          Bindings({
            '?a': DF.namedNode('bound-a'),
            '?b': DF.namedNode('bound-b-FILTERED'),
          }),
        ]);
      });
    });
  });
});
