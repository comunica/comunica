import type { IMergeHandler } from '@comunica/bus-merge-binding-factory';
import type { ActionContextKey } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based Bindings object.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  public context: IActionContext;
  private readonly contextMergeHandlers: Record<string, IMergeHandler<any>>;

  private readonly dataFactory: RDF.DataFactory;
  private readonly entries: Map<string, RDF.Term>;

  public constructor(dataFactory: RDF.DataFactory, entries: Map<string, RDF.Term>,
    contextMergeHandlers: Record<string, IMergeHandler<any>>,
    context: IActionContext = new ActionContext()) {
    this.dataFactory = dataFactory;
    this.entries = entries;

    this.context = context;
    this.contextMergeHandlers = contextMergeHandlers;
  }

  public has(key: RDF.Variable | string): boolean {
    return this.entries.has(typeof key === 'string' ? key : key.value);
  }

  public get(key: RDF.Variable | string): RDF.Term | undefined {
    return this.entries.get(typeof key === 'string' ? key : key.value);
  }

  public set(key: RDF.Variable | string, value: RDF.Term): Bindings {
    return new Bindings(this.dataFactory,
      this.entries.set(typeof key === 'string' ? key : key.value, value),
      this.contextMergeHandlers);
  }

  public delete(key: RDF.Variable | string): Bindings {
    return new Bindings(this.dataFactory,
      this.entries.delete(typeof key === 'string' ? key : key.value),
      this.contextMergeHandlers);
  }

  public keys(): Iterable<RDF.Variable> {
    return this.mapIterable<string, RDF.Variable>(
      this.iteratorToIterable(this.entries.keys()),
      key => this.dataFactory.variable!(key),
    );
  }

  public values(): Iterable<RDF.Term> {
    return this.iteratorToIterable(this.entries.values());
  }

  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    this.entries.forEach((value, key) => fn(value, this.dataFactory.variable!(key)));
  }

  public get size(): number {
    return this.entries.size;
  }

  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    return this.mapIterable<[string, RDF.Term], [RDF.Variable, RDF.Term]>(
      this.iteratorToIterable(<Iterator<[string, RDF.Term]>> this.entries.entries()),
      ([ key, value ]) => [ this.dataFactory.variable!(key), value ],
    )[Symbol.iterator]();
  }

  public equals(other: RDF.Bindings | null | undefined): boolean {
    if (!other) {
      return false;
    }
    if (this === other) {
      return true;
    }

    // First check if size is equal
    if (this.size !== other.size) {
      return false;
    }

    // Then check if keys and values are equal
    for (const key of this.keys()) {
      if (!this.get(key)?.equals(other.get(key))) {
        return false;
      }
    }

    return true;
  }

  public filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean): Bindings {
    return new Bindings(this.dataFactory, Map(<any> this.entries
      .filter((value, key) => fn(value, this.dataFactory.variable!(key)))), this.contextMergeHandlers);
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    return new Bindings(this.dataFactory, Map(<any> this.entries
      .map((value, key) => fn(value, this.dataFactory.variable!(key)))), this.contextMergeHandlers);
  }

  public merge(other: RDF.Bindings | Bindings): Bindings | undefined {
    // Determine the union of keys
    const keys = new Set([
      ...this.iteratorToIterable(this.entries.keys()),
      ...[ ...other.keys() ].map(key => key.value),
    ]);

    // Collect entries
    const entries: [string, RDF.Term][] = [];
    for (const key of keys) {
      const left = this.entries.get(key)!;
      const right = other.get(this.dataFactory.variable!(key));
      if (left && right && !left.equals(right)) {
        return;
      }
      const value = left || right;
      entries.push([ key, value ]);
    }

    // If any context is empty we skip merging contexts
    if (this.context.contextSize() > 0) {
      let mergedContext = this.context;
      // Only merge if the other has a context
      if ('context' in other) {
        const otherAsBinding = other;
        if (otherAsBinding.context.contextSize() > 0) {
          mergedContext = this.mergeContext(other);
        }
      }
      return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, mergedContext);
    }

    return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, this.context);
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings,
  ): Bindings {
    // Determine the union of keys
    const keys = new Set([
      ...this.iteratorToIterable(this.entries.keys()),
      ...[ ...other.keys() ].map(key => key.value),
    ]);

    // Collect entries
    const entries: [string, RDF.Term][] = [];
    for (const key of keys) {
      const variable = this.dataFactory.variable!(key);
      const left = this.entries.get(key)!;
      const right = other.get(variable);
      let value: RDF.Term;
      if (left && right && !left.equals(right)) {
        value = merger(left, right, variable);
      } else {
        value = left || right;
      }
      entries.push([ key, value ]);
    }
    let mergedContext = this.context;
    // Only merge if the other has a context
    if ('context' in other) {
      const otherAsBinding = <Bindings> other;
      // If we have empty context we skip the context merge (This is likely not needed / doesn't give performance boost)
      if (this.context.keys().length > 0 || otherAsBinding.context.keys().length > 0) {
        mergedContext = this.mergeContext(other);
      }
    }

    return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, mergedContext);
  }

  private mergeContext(other: RDF.Bindings | Bindings): IActionContext {
    const otherAsBinding = <Bindings> other;
    // Get Set of all keys present in either of the bindings
    const keysContext = this.unique_keys([ ...this.context.keys(),
      ...otherAsBinding.context.keys() ]);

    // Get Set of all keys present in both bindings
    const keysBothContext = this.context.keys().filter(
      element => otherAsBinding.context.keys().some(({ name }) => element.name === name),
    );
    let mergedContext: IActionContext = this.context;
    // Merge context based on supplied mergeHandlers
    for (const key of keysContext) {
      const keyString = key.name;
      const occursInBoth = keysBothContext.some(x => x.name === key.name);

      if (this.contextMergeHandlers[keyString] && occursInBoth) {
        mergedContext = mergedContext.set(key, this.contextMergeHandlers[keyString]
          .run(mergedContext.get(key), otherAsBinding.context.get(key)));
        continue;
      }
      // For keys in both bindings we require a mergehandler. If no mergehandler is supplied the keys
      // are removed in the result
      if (!this.contextMergeHandlers[keyString] && occursInBoth) {
        mergedContext = mergedContext.delete(key);
        continue;
      }
      // If it doesn't occur in both contexts, we simply copy the context entry into the new binding
      if (!occursInBoth && !this.context.get(key)) {
        mergedContext = mergedContext.set(key, otherAsBinding.context.get(key));
      }
    }
    return mergedContext;
  }

  public toString(): string {
    return bindingsToString(this);
  }

  private unique_keys(keyArray: ActionContextKey<any>[]): ActionContextKey<any>[] {
    const seen: Record<string, number> = {};
    const out = [];
    const len = keyArray.length;
    let j = 0;
    for (let i = 0; i < len; i++) {
      const item = keyArray[i];
      if (seen[item.name] !== 1) {
        seen[item.name] = 1;
        out[j++] = item;
      }
    }
    return out;
  }

  protected * mapIterable<T, U>(iterable: Iterable<T>, callback: (value: T) => U): Iterable<U> {
    for (const x of iterable) {
      // eslint-disable-next-line callback-return
      yield callback(x);
    }
  }

  protected iteratorToIterable<T>(iterator: Iterator<T>): Iterable<T> {
    return {
      [Symbol.iterator]: () => iterator,
    };
  }
}
