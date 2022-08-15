import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { PathVariableObjectIterator } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory();
const FACTORY = new Factory();

describe('PathVariableObjectIterator', () => {
  let createdBindingsStreams: BindingsStream[];
  let mediatorQueryOperation: MediatorQueryOperation;
  let iterator: PathVariableObjectIterator;

  beforeEach(() => {
    createdBindingsStreams = [];
    mediatorQueryOperation = <any> {
      mediate: jest.fn(() => {
        const bindingsStream = new BufferedIterator<RDF.Bindings>({ autoStart: false });
        jest.spyOn(bindingsStream, 'destroy');
        createdBindingsStreams.push(bindingsStream);
        return { type: 'bindings', bindingsStream };
      }),
    };
    iterator = new PathVariableObjectIterator(
      DF.namedNode('ex:s'),
      FACTORY.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );
  });

  it('destroys the iterator when an error occurs during mediation', async() => {
    mediatorQueryOperation.mediate = () => Promise
      .reject(new Error('mediatorQueryOperation rejection in PathVariableObjectIterator'));

    iterator = new PathVariableObjectIterator(
      DF.namedNode('ex:s'),
      FACTORY.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    await expect(new Promise((resolve, reject) => {
      iterator.on('end', resolve);
      iterator.on('error', reject);
    })).rejects.toThrow('mediatorQueryOperation rejection in PathVariableObjectIterator');
  });

  it('destroys the iterator when an error occurs during a running operation', async() => {
    mediatorQueryOperation.mediate = <any> (async() => {
      const bindingsStream = new BufferedIterator<RDF.Bindings>({ autoStart: false });
      (<any> bindingsStream)._read = () => {
        bindingsStream.emit('error', new Error('stream error in PathVariableObjectIterator'));
      };
      return { type: 'bindings', bindingsStream };
    });

    iterator = new PathVariableObjectIterator(
      DF.namedNode('ex:s'),
      FACTORY.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    await expect(new Promise((resolve, reject) => {
      iterator.on('end', resolve);
      iterator.on('error', reject);
    })).rejects.toThrow('stream error in PathVariableObjectIterator');
  });

  it('destroys runningOperations when closed', async() => {
    iterator.read();
    await new Promise(setImmediate);

    iterator.close();
    await new Promise(setImmediate);

    expect(createdBindingsStreams.length).toEqual(1);
    expect(createdBindingsStreams[0].destroy).toHaveBeenCalled();
  });

  it('removes duplicates', async() => {
    mediatorQueryOperation.mediate = <any> (async() => {
      const bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({ b: DF.namedNode('ex:a') }),
        BF.fromRecord({ b: DF.namedNode('ex:a') }),
        BF.fromRecord({ b: DF.namedNode('ex:b') }),
      ], { autoStart: false });
      return { type: 'bindings', bindingsStream };
    });

    iterator = new PathVariableObjectIterator(
      DF.namedNode('ex:s'),
      FACTORY.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    expect(await arrayifyStream(iterator)).toEqual([
      DF.namedNode('ex:s'),
      DF.namedNode('ex:a'),
      DF.namedNode('ex:b'),
    ]);
  });
});
