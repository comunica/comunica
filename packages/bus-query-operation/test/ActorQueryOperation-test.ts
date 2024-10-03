import { Bus } from '@comunica/core';
import { cachifyMetadata, MetadataValidationState } from '@comunica/metadata';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { FunctionArgumentsCache } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryOperation } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('ActorQueryOperation', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The ActorQueryOperation module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperation).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperation constructor', () => {
      expect(new (<any> ActorQueryOperation)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperation objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQueryOperation)();
      }).toThrow(`Class constructor ActorQueryOperation cannot be invoked without 'new'`);
    });
  });
});
