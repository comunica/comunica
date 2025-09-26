import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActionContext } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IActionContextKey } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Map } from 'immutable';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based Bindings object.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  private readonly dataFactory: ComunicaDataFactory;
  private readonly entries: Map<string, RDF.Term>;
  private readonly contextHolder: IContextHolder | undefined;

  public constructor(dataFactory: ComunicaDataFactory, entries: Map<string, RDF.Term>, contextHolder?: IContextHolder) {
    this.dataFactory = dataFactory;
    this.entries = entries;
    this.contextHolder = contextHolder;
  }

  public has(key: RDF.Variable | string): boolean {
    return this.entries.has(typeof key === 'string' ? key : key.value);
  }

  public get(key: RDF.Variable | string): RDF.Term | undefined {
    return this.entries.get(typeof key === 'string' ? key : key.value);
  }

  public set(key: RDF.Variable | string, value: RDF.Term): Bindings {
    return new Bindings(
      this.dataFactory,
      this.entries.set(typeof key === 'string' ? key : key.value, value),
      this.contextHolder,
    );
  }

  public delete(key: RDF.Variable | string): Bindings {
    return new Bindings(
      this.dataFactory,
      this.entries.delete(typeof key === 'string' ? key : key.value),
      this.contextHolder,
    );
  }

  public keys(): Iterable<RDF.Variable> {
    return this.mapIterable<string, RDF.Variable>(
      this.iteratorToIterable(this.entries.keys()),
      key => this.dataFactory.variable(key),
    );
  }

  public values(): Iterable<RDF.Term> {
    return this.iteratorToIterable(this.entries.values());
  }

  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    for (const [ key, value ] of this.entries.entries()) {
      fn(value, this.dataFactory.variable(key));
    }
  }

  public get size(): number {
    return this.entries.size;
  }

  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    return this.mapIterable<[string, RDF.Term], [RDF.Variable, RDF.Term]>(
      this.iteratorToIterable(<Iterator<[string, RDF.Term]>> this.entries.entries()),
      ([ key, value ]) => [ this.dataFactory.variable(key), value ],
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
    return new Bindings(this.dataFactory, Map<string, RDF.Term>(<any> this.entries
      .filter((value, key) => fn(value, this.dataFactory.variable(key)))), this.contextHolder);
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    return new Bindings(this.dataFactory, Map<string, RDF.Term>(<any> this.entries
      .map((value, key) => fn(value, this.dataFactory.variable(key)))), this.contextHolder);
  }

  public merge(other: RDF.Bindings | Bindings): Bindings | undefined {
    if (this.size < other.size && other instanceof Bindings) {
      return other.merge(this);
    }
    let entries = this.entries;

    // Check if other is of type Bindings, in that case we can access entries immediately.
    // This skips the unnecessary conversion from string to variable.
    if (other instanceof Bindings) {
      for (const [ variable, right ] of other.entries) {
        const left = this.entries.get(variable);
        if (left && !left.equals(right)) {
          return;
        }
        entries = entries.set(variable, right);
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries.get(variable.value);
        if (left && !left.equals(right)) {
          return;
        }
        entries = entries.set(variable.value, right);
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings | Bindings,
  ): Bindings {
    if (this.size < other.size && other instanceof Bindings) {
      return other.mergeWith(merger, this);
    }
    let entries = this.entries;

    // For code comments see Bindings.merge function
    if (other instanceof Bindings) {
      for (const [ variable, right ] of other.entries) {
        const left = this.entries.get(variable);
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, this.dataFactory.variable(variable));
        } else {
          value = right;
        }
        entries = entries.set(variable, value);
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries.get(variable.value);
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, variable);
        } else {
          value = right;
        }
        entries = entries.set(variable.value, value);
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  protected createBindingsWithContexts(entries: Map<string, RDF.Term>, other: RDF.Bindings | Bindings): Bindings {
    // If any context is empty, we skip merging contexts
    if (this.contextHolder && this.contextHolder.context) {
      let mergedContext = this.contextHolder.context;
      // Only merge if the other has a context
      if ('contextHolder' in other && other.contextHolder && other.contextHolder.context) {
        mergedContext = Bindings
          .mergeContext(this.contextHolder.contextMergeHandlers, mergedContext, other.contextHolder.context);
      }
      return new Bindings(
        this.dataFactory,
        entries,
        { contextMergeHandlers: this.contextHolder.contextMergeHandlers, context: mergedContext },
      );
    }

    // Otherwise, use optional context from other
    return new Bindings(this.dataFactory, entries, (<Bindings> other).contextHolder);
  }

  private static mergeContext(
    contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>>,
    context: IActionContext,
    otherContext: IActionContext,
  ): IActionContext {
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
      if (contextMergeHandlers[key.name] && occursInBoth) {
        newContextData[key.name] = contextMergeHandlers[key.name]
          .run(context.get(key), otherContext.get(key));
        continue;
      }
      // If we have no merge handler, but both contexts have entries for key, we don't add it to new context
      if (!contextMergeHandlers[key.name] && occursInBoth) {
        continue;
      }

      // If key doesn't occur in own context, it must be in other context
      // (if we get to this point, the key doesn't occur in both)
      newContextData[key.name] = context.get(key) || otherContext.get(key);
    }
    return new ActionContext(newContextData);
  }

  public setContextEntry<V>(key: IActionContextKey<V>, value: any): Bindings {
    return this.setContextEntryRaw(key, value);
  }

  public setContextEntryRaw<V>(key: IActionContextKey<V>, value: any): Bindings {
    if (this.contextHolder && this.contextHolder.context) {
      return new Bindings(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context.set(key, value),
        },
      );
    }
    return new Bindings(
      this.dataFactory,
      this.entries,
      {
        contextMergeHandlers: this.contextHolder?.contextMergeHandlers ?? {},
        context: new ActionContext().set(key, value),
      },
    );
  }

  public deleteContextEntry<V>(key: IActionContextKey<V>): Bindings {
    return this.deleteContextEntryRaw(key);
  }

  public deleteContextEntryRaw<V>(key: IActionContextKey<V>): Bindings {
    if (this.contextHolder) {
      return new Bindings(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context?.delete(key),
        },
      );
    }
    return new Bindings(this.dataFactory, this.entries);
  }

  public getContext(): IActionContext | undefined {
    return this.contextHolder?.context;
  }

  public getContextEntry<V>(key: IActionContextKey<V>): V | undefined {
    return this.getContext()?.get(key);
  }

  public toString(): string {
    return bindingsToString(this);
  }

  protected* mapIterable<T, U>(iterable: Iterable<T>, callback: (value: T) => U): Iterable<U> {
    for (const x of iterable) {
      yield callback(x);
    }
  }

  protected iteratorToIterable<T>(iterator: Iterator<T>): Iterable<T> {
    return {
      [Symbol.iterator]: () => iterator,
    };
  }
}

export interface IContextHolder {
  contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>>;
  context?: IActionContext;
}
