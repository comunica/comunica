import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();
const FACTORY = new Factory();

/**
 * An iterator that implements the multi-length property path operation (* and +)
 * for a fixed subject and predicate, and a variable object.
 */
export class PathVariableObjectIterator extends BufferedIterator<RDF.Term> {
  private readonly termHashes: Map<string, RDF.Term> = new Map();
  private readonly runningOperations: AsyncIterator<RDF.Term>[] = [];
  private readonly pendingOperations: { variable: RDF.Variable; operation: Algebra.Path }[] = [];

  public constructor(
    private readonly subject: RDF.Term,
    private readonly predicate: Algebra.PropertyPathSymbol,
    private readonly graph: RDF.Term,
    private readonly context: IActionContext,
    private readonly mediatorQueryOperation: MediatorQueryOperation,
    emitFirstSubject: boolean,
    private readonly maxRunningOperations = 16,
  ) {
    // The autoStart flag must be true to kickstart metadata collection
    super({ autoStart: true });

    // Push the subject as starting point
    this._push(this.subject, emitFirstSubject);
  }

  protected _end(destroy?: boolean): void {
    // Close all running iterators
    for (const it of this.runningOperations) {
      it.destroy();
    }

    super._end(destroy);
  }

  protected _push(item: RDF.Term, pushAsResult = true): void {
    let termString;
    if (pushAsResult) {
      // Don't push if this subject was already found
      termString = termToString(item);
      if (this.termHashes.has(termString)) {
        return;
      }
    }

    // Add a pending path operation for this item
    const variable = DF.variable('b');
    this.pendingOperations.push({
      variable,
      operation: FACTORY.createPath(item, this.predicate, variable, this.graph),
    });

    // Otherwise, push the subject
    if (termString) {
      this.termHashes.set(termString, item);
      super._push(item);
    }
  }

  protected _read(count: number, done: () => void): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
    const self = this;
    (async function() {
      // Open as many operations as possible
      while (self.runningOperations.length < self.maxRunningOperations) {
        if (self.pendingOperations.length === 0) {
          break;
        }

        const pendingOperation = self.pendingOperations.pop()!;
        const results = ActorQueryOperation.getSafeBindings(
          await self.mediatorQueryOperation.mediate({ operation: pendingOperation.operation, context: self.context }),
        );
        const runningOperation = results.bindingsStream.transform<RDF.Term>({
          autoStart: false,
          transform(bindings, next, push) {
            const newTerm: RDF.Term = bindings.get(pendingOperation.variable)!;
            push(newTerm);
            next();
          },
        });
        if (!runningOperation.done) {
          self.runningOperations.push(runningOperation);
          runningOperation.on('error', error => self.destroy(error));
          runningOperation.on('readable', () => {
            self.readable = true;
            self._fillBufferAsync();
          });
          runningOperation.on('end', () => {
            self.runningOperations.splice(self.runningOperations.indexOf(runningOperation), 1);
            self.readable = true;
            self._fillBufferAsync();
          });
        }

        self.setProperty('metadata', results.metadata);
      }

      // Try to read `count` items (based on UnionIterator)
      let lastCount = 0;
      let item: RDF.Term | null;
      // eslint-disable-next-line no-cond-assign
      while (lastCount !== (lastCount = count)) {
        // Prioritize the operations that have been added first
        for (let i = 0; i < self.runningOperations.length && count > 0; i++) {
          // eslint-disable-next-line no-cond-assign
          if ((item = self.runningOperations[i].read()) !== null) {
            count--;
            self._push(item);
          }
        }
      }

      // Close if everything has been read
      if (self.runningOperations.length === 0 && self.pendingOperations.length === 0) {
        self.close();
      }
    })().then(() => {
      done();
    }, error => this.destroy(error));
  }
}
