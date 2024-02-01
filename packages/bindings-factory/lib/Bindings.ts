import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IActionContextKey } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based Bindings object.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  public context: IActionContext | undefined;
  private readonly contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>> | undefined;

  private readonly dataFactory: RDF.DataFactory;
  private readonly entries: Map<string, RDF.Term>;

  public constructor(dataFactory: RDF.DataFactory, entries: Map<string, RDF.Term>,
    contextMergeHandlers?: Record<string, IBindingsContextMergeHandler<any>>,
    context?: IActionContext) {
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
      this.contextMergeHandlers,
      this.context);
  }

  public delete(key: RDF.Variable | string): Bindings {
    return new Bindings(this.dataFactory,
      this.entries.delete(typeof key === 'string' ? key : key.value),
      this.contextMergeHandlers,
      this.context);
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
      .filter((value, key) => fn(value, this.dataFactory.variable!(key)))), this.contextMergeHandlers, this.context);
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    return new Bindings(this.dataFactory, Map(<any> this.entries
      .map((value, key) => fn(value, this.dataFactory.variable!(key)))), this.contextMergeHandlers, this.context);
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
    if (this.context && this.contextMergeHandlers) {
      let mergedContext = this.context;
      // Only merge if the other has a context
      if ('context' in other && other.context) {
        mergedContext = this.mergeContext(mergedContext, other.context);
      }
      return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, mergedContext);
    }
    const castOther = <Bindings>other;
    return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, castOther.context);
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings | Bindings,
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

    if (this.context && this.contextMergeHandlers) {
      let mergedContext = this.context;
      // Only merge if the other has a context
      if ('context' in other && other.context) {
        mergedContext = this.mergeContext(mergedContext, other.context);
      }
      return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, mergedContext);
    }
    const castOther = <Bindings> other;
    return new Bindings(this.dataFactory, Map(entries), this.contextMergeHandlers, castOther.context);
  }

  private mergeContext(context: IActionContext, otherContext: IActionContext): IActionContext {
    // All keys can contain duplicates, we prevent this by checking our built datamap for duplicates
    const allKeys = [ ...context.keys(), ...otherContext.keys() ];
    // Map we build up with merged context values
    const newContextData: Record<string, any> = {};
    const handledKeys: Record<string, number> = {};

    // Set of names of keys in other context to allow for constant time lookup
    const keysSetOtherContext = new Set(
      otherContext.keys().map(key => key.name),
    );
    const keysBothContext = context.keys().filter(
      key => keysSetOtherContext.has(key.name),
    );

    for (const key of allKeys) {
      // If duplicate key, we continue iterating
      if (handledKeys[key.name] === 1) {
        continue;
      }

      // We've processed this key and shouldn't repeat it
      handledKeys[key.name] = 1;

      // Determine whether this key occurs in both contexts
      const occursInBoth = keysBothContext.some(x => x.name === key.name);

      // If we execute this function, we already check for existence of context merge handlers
      // This if statement is first as the most likely case for non-empty contexts is that we have mergehandlers
      // and both contexts have an entry
      if (this.contextMergeHandlers![key.name] && occursInBoth) {
        newContextData[key.name] = this.contextMergeHandlers![key.name]
          .run(context.get(key), otherContext.get(key));
        continue;
      }
      // If we have no merge handler, but both contexts have entries for key, we don't add it to new context
      if (!this.contextMergeHandlers![key.name] && occursInBoth) {
        continue;
      }

      // If key doesn't occur in own context, it must be in other context
      // (if we get to this point, the key doesn't occur in both)
      if (!context.get(key)) {
        newContextData[key.name] = otherContext.get(key);
        continue;
      }
      // This could likely be else statement, but don't want to risk it
      if (!otherContext.get(key)) {
        newContextData[key.name] = context.get(key);
        continue;
      }
    }
    return new ActionContext(newContextData);
  }

  public setContextEntry<V>(key: IActionContextKey<V>, value: any): Bindings {
    return this.setContextEntryRaw(key, value);
  }

  public setContextEntryRaw<V>(key: IActionContextKey<V>, value: any): Bindings {
    if (this.context) {
      return new Bindings(this.dataFactory, this.entries, this.contextMergeHandlers, this.context.set(key, value));
    }
    return new Bindings(this.dataFactory, this.entries, this.contextMergeHandlers, new ActionContext().set(key, value));
  }

  public deleteContextEntry<V>(key: IActionContextKey<V>): Bindings {
    return this.deleteContextEntryRaw(key);
  }

  public deleteContextEntryRaw<V>(key: IActionContextKey<V>): Bindings {
    return new Bindings(this.dataFactory, this.entries, this.contextMergeHandlers, this.context?.delete(key));
  }

  public getContextEntry<V>(key: IActionContextKey<V>): V | undefined {
    return this.context?.get(key);
  }

  public toString(): string {
    return bindingsToString(this);
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
