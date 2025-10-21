import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActionContext } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { PathVariableObjectIterator } from '../lib';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);

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
  });

  it('destroys the iterator when an error occurs during mediation', async() => {
    mediatorQueryOperation.mediate = () => Promise
      .reject(new Error('mediatorQueryOperation rejection in PathVariableObjectIterator'));

    iterator = new PathVariableObjectIterator(
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );
    iterator.on('data', () => {
      // Do nothing
    });

    await expect(new Promise((resolve, reject) => {
      iterator.on('end', resolve);
      iterator.on('error', (e) => {
        iterator.close();
        iterator.destroy();
        reject(e);
      });
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
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );
    iterator.on('data', () => {
      // Do nothing
    });

    await expect(new Promise((resolve, reject) => {
      iterator.on('end', resolve);
      iterator.on('error', reject);
    })).rejects.toThrow('stream error in PathVariableObjectIterator');
  });

  it('destroys runningOperations when closed', async() => {
    iterator = new PathVariableObjectIterator(
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    iterator.read();
    await new Promise(setImmediate);
    iterator.read();
    await new Promise(setImmediate);

    iterator.close();
    await new Promise(setImmediate);

    expect(createdBindingsStreams).toHaveLength(1);
    expect(createdBindingsStreams[0].destroy).toHaveBeenCalledTimes(1);
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
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    await expect(arrayifyStream(iterator)).resolves.toEqual([
      DF.namedNode('ex:s'),
      DF.namedNode('ex:a'),
      DF.namedNode('ex:b'),
    ]);
  });

  it('kickstarts the iterator when requesting metadata', async() => {
    mediatorQueryOperation.mediate = <any> (async() => {
      const bindingsStream = new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({ b: DF.namedNode('ex:a') }),
        BF.fromRecord({ b: DF.namedNode('ex:a') }),
        BF.fromRecord({ b: DF.namedNode('ex:b') }),
      ], { autoStart: false });
      return { type: 'bindings', bindingsStream, metadata: 'META' };
    });

    iterator = new PathVariableObjectIterator(
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    const metadata = await new Promise((resolve, reject) => {
      iterator.getProperty('metadata', resolve);
      iterator.on('error', reject);
    });

    expect(metadata).toBe('META');
  });

  it('kickstarts the iterator when requesting metadata that errors', async() => {
    mediatorQueryOperation.mediate = () => Promise
      .reject(new Error('mediatorQueryOperation rejection in PathVariableObjectIterator'));

    iterator = new PathVariableObjectIterator(
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );

    await expect(new Promise((resolve, reject) => {
      iterator.getProperty('metadata', resolve);
      iterator.on('error', reject);
    })).rejects.toThrow('mediatorQueryOperation rejection in PathVariableObjectIterator');
  });

  it('handles immediately ending mediation results', async() => {
    mediatorQueryOperation.mediate = <any> (() => {
      const bindingsStream = new ArrayIterator<RDF.Bindings>([]);
      createdBindingsStreams.push(bindingsStream);
      return { type: 'bindings', bindingsStream };
    });

    iterator = new PathVariableObjectIterator(
      AF,
      DF.namedNode('ex:s'),
      AF.createLink(DF.namedNode('ex:p')),
      DF.namedNode('ex:g'),
      new ActionContext(),
      mediatorQueryOperation,
      true,
    );
    await expect(iterator.toArray()).resolves.toEqual([ DF.namedNode('ex:s') ]);
  });
});
