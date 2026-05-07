import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { IActionContext } from '@comunica/types';
import type { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * An iterator that implements the multi-length property path operation (* and +)
 * for a fixed subject and predicate, and a variable object.
 */
export class PathVariableObjectIterator extends BufferedIterator<RDF.Term> {
  private readonly termHashes: Map<string, RDF.Term> = new Map();
  private readonly runningOperations: AsyncIterator<RDF.Term>[] = [];
  private readonly pendingOperations: { variable: RDF.Variable; operation: Algebra.Path }[] = [];
  private started = false;

  /**
   * @param algebraFactory The algebra factory for creating path operations.
   * @param subject The starting subject term.
   * @param predicate The path predicate operation.
   * @param graph The graph term.
   * @param context The action context.
   * @param mediatorQueryOperation The query operation mediator.
   * @param emitFirstSubject Whether to emit the initial subject as a result.
   * @param maxRunningOperations The maximum number of concurrent path evaluations.
   */
  public constructor(
    private readonly algebraFactory: AlgebraFactory,
    private readonly subject: RDF.Term,
    private readonly predicate: Algebra.Operation,
    private readonly graph: RDF.Term,
    private readonly context: IActionContext,
    private readonly mediatorQueryOperation: MediatorQueryOperation,
    emitFirstSubject: boolean,
    private readonly maxRunningOperations = 16,
  ) {
    super({ autoStart: false });

    // Push the subject as starting point
    this._push(this.subject, emitFirstSubject);
  }

  /**
   * Returns a property value, kickstarting the iterator when metadata is first requested.
   * @param propertyName The property name to retrieve.
   * @param callback An optional callback to invoke with the property value.
   * @return The property value, if available synchronously.
   */
  public override getProperty<P>(propertyName: string, callback?: (value: P) => void): P | undefined {
    // Kickstart iterator when metadata is requested
    if (!this.started && propertyName === 'metadata') {
      this.startNextOperation(false)
        .catch(error => this.emit('error', error));
    }
    return super.getProperty(propertyName, callback);
  }

  /**
   * Destroys all running sub-iterators and ends this iterator.
   * @param destroy Whether to destroy the iterator.
   */
  protected override _end(destroy?: boolean): void {
    // Close all running iterators
    for (const it of this.runningOperations) {
      it.destroy();
    }

    super._end(destroy);
  }

  /**
   * Pushes an item, skipping duplicates and registering a new pending path operation.
   * @param item The RDF term to push.
   * @param pushAsResult Whether to emit the item as a result.
   * @return True if the item was pushed, false if it was a duplicate.
   */
  protected override _push(item: RDF.Term, pushAsResult = true): boolean {
    let termString;
    if (pushAsResult) {
      // Don't push if this subject was already found
      termString = termToString(item);
      if (this.termHashes.has(termString)) {
        return false;
      }
    }

    // Add a pending path operation for this item
    const variable = this.algebraFactory.dataFactory.variable!('b');
    this.pendingOperations.push({
      variable,
      operation: this.algebraFactory.createPath(item, this.predicate, variable, this.graph),
    });

    // Otherwise, push the subject
    if (termString) {
      this.termHashes.set(termString, item);
      super._push(item);
    }
    return true;
  }

  /**
   * Starts the next pending path operation and subscribes to its output.
   * @param fillBuffer Whether to fill the buffer when results arrive.
   */
  protected async startNextOperation(fillBuffer: boolean): Promise<void> {
    this.started = true;

    const pendingOperation = this.pendingOperations.pop()!;
    const results = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pendingOperation.operation, context: this.context }),
    );
    const runningOperation = results.bindingsStream.map<RDF.Term>(
      bindings => <RDF.Term> bindings.get(pendingOperation.variable),
    );

    this.runningOperations.push(runningOperation);
    runningOperation.on('error', error => this.destroy(error));
    runningOperation.on('readable', () => {
      if (fillBuffer) {
        this._fillBufferAsync();
      }
      this.readable = true;
    });
    runningOperation.on('end', () => {
      this.runningOperations.splice(this.runningOperations.indexOf(runningOperation), 1);
      if (fillBuffer) {
        this._fillBufferAsync();
      }
      this.readable = true;
    });

    if (!this.getProperty('metadata')) {
      this.setProperty('metadata', results.metadata);
    }
  }

  /**
   * Reads items from running operations, starting new operations as capacity allows.
   * @param count The number of items to read.
   * @param done A callback to invoke when reading is complete.
   */
  protected override _read(count: number, done: () => void): void {
    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    (async function() {
      // Open as many operations as possible
      while (self.runningOperations.length < self.maxRunningOperations) {
        if (self.pendingOperations.length === 0) {
          break;
        }
        await self.startNextOperation(true);
      }

      // Try to read `count` items (based on UnionIterator)
      let lastCount = 0;
      let item: RDF.Term | null;
      let pushSucceeded = true;
      // eslint-disable-next-line no-cond-assign
      while (!pushSucceeded || lastCount !== (lastCount = count)) {
        pushSucceeded = true;
        // Prioritize the operations that have been added first
        for (let i = 0; i < self.runningOperations.length && count > 0; i++) {
          // eslint-disable-next-line no-cond-assign
          if ((item = self.runningOperations[i].read()) !== null) {
            if (self._push(item)) {
              count--;
            } else {
              pushSucceeded = false;
            }
          }
        }
      }

      // Close if everything has been read
      self.closeIfNeeded();
    })().then(() => {
      done();
    }, error => this.destroy(error));
  }

  /**
   * Closes this iterator if there are no more running or pending operations.
   */
  protected closeIfNeeded(): void {
    if (this.runningOperations.length === 0 && this.pendingOperations.length === 0) {
      this.close();
    }
  }
}
