import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActionContext } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IActionContextKey } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { bindingsToString } from './bindingsToString';

/**
 * An immutable.js-based BindingsRaw object.
 */
export class BindingsRaw implements RDF.Bindings {
  public readonly type = 'bindings';

  private readonly dataFactory: ComunicaDataFactory;
  private readonly entries: Record<string, RDF.Term>;
  private readonly contextHolder: IContextHolder | undefined;

  public constructor(
    dataFactory: ComunicaDataFactory,
    entries: Record<string, RDF.Term>,
    contextHolder?: IContextHolder,
  ) {
    this.dataFactory = dataFactory;
    this.entries = entries;
    this.contextHolder = contextHolder;
  }

  public has(key: RDF.Variable | string): boolean {
    return (typeof key === 'string' ? key : key.value) in this.entries;
  }

  public get(key: RDF.Variable | string): RDF.Term | undefined {
    return this.entries[typeof key === 'string' ? key : key.value];
  }

  public set(key: RDF.Variable | string, value: RDF.Term): BindingsRaw {
    return new BindingsRaw(
      this.dataFactory,
      { ...this.entries, [typeof key === 'string' ? key : key.value]: value },
      this.contextHolder,
    );
  }

  public delete(key: RDF.Variable | string): BindingsRaw {
    const entries = { ...this.entries };
    delete entries[typeof key === 'string' ? key : key.value];
    return new BindingsRaw(
      this.dataFactory,
      entries,
      this.contextHolder,
    );
  }

  public keys(): Iterable<RDF.Variable> {
    return Object.keys(this.entries).map(key => this.dataFactory.variable(key));
  }

  public values(): Iterable<RDF.Term> {
    return Object.values(this.entries);
  }

  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    for (const [ key, value ] of Object.entries(this.entries)) {
      fn(value, this.dataFactory.variable(key));
    }
  }

  public get size(): number {
    return Object.keys(this.entries).length;
  }

  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    return Object.entries(this.entries)
      .map<[RDF.Variable, RDF.Term]>(([ key, value ]) => [ this.dataFactory.variable(key), value ])[Symbol.iterator]();
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

  public filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean): BindingsRaw {
    return new BindingsRaw(this.dataFactory, Object.fromEntries(Object.entries(this.entries)
      .filter(([ key, value ]) => fn(value, this.dataFactory.variable(key)))), this.contextHolder);
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): BindingsRaw {
    return new BindingsRaw(this.dataFactory, Object.fromEntries(Object.entries(this.entries)
      .map(([ key, value ]) => [ key, fn(value, this.dataFactory.variable(key)) ])), this.contextHolder);
  }

  public merge(other: RDF.Bindings | BindingsRaw): BindingsRaw | undefined {
    if (this.size < other.size && other instanceof BindingsRaw) {
      return other.merge(this);
    }
    const entries = { ...this.entries };

    // Check if other is of type BindingsRaw, in that case we can access entries immediately.
    // This skips the unnecessary conversion from string to variable.
    if (other instanceof BindingsRaw) {
      for (const [ variable, right ] of Object.entries(other.entries)) {
        const left = this.entries[variable];
        if (left && !left.equals(right)) {
          return;
        }
        entries[variable] = right;
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries[variable.value];
        if (left && !left.equals(right)) {
          return;
        }
        entries[variable.value] = right;
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings | BindingsRaw,
  ): BindingsRaw {
    if (this.size < other.size && other instanceof BindingsRaw) {
      return other.mergeWith(merger, this);
    }
    const entries = { ...this.entries };

    // For code comments see BindingsRaw.merge function
    if (other instanceof BindingsRaw) {
      for (const [ variable, right ] of Object.entries(other.entries)) {
        const left = this.entries[variable];
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, this.dataFactory.variable(variable));
        } else {
          value = right;
        }
        entries[variable] = value;
      }
    } else {
      for (const [ variable, right ] of other) {
        const left = this.entries[variable.value];
        let value: RDF.Term;
        if (left && !left.equals(right)) {
          value = merger(left, right, variable);
        } else {
          value = right;
        }
        entries[variable.value] = value;
      }
    }

    return this.createBindingsWithContexts(entries, other);
  }

  protected createBindingsWithContexts(entries: Record<string, RDF.Term>, other: RDF.Bindings | BindingsRaw): BindingsRaw {
    // If any context is empty, we skip merging contexts
    if (this.contextHolder && this.contextHolder.context) {
      let mergedContext = this.contextHolder.context;
      // Only merge if the other has a context
      if ('contextHolder' in other && other.contextHolder && other.contextHolder.context) {
        mergedContext = BindingsRaw
          .mergeContext(this.contextHolder.contextMergeHandlers, mergedContext, other.contextHolder.context);
      }
      return new BindingsRaw(
        this.dataFactory,
        entries,
        { contextMergeHandlers: this.contextHolder.contextMergeHandlers, context: mergedContext },
      );
    }

    // Otherwise, use optional context from other
    return new BindingsRaw(this.dataFactory, entries, (<BindingsRaw> other).contextHolder);
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
      if (!context.get(key)) {
        newContextData[key.name] = otherContext.get(key);
        continue;
      }
      // This could likely be else statement, but don't want to risk it
      if (!otherContext.get(key)) {
        newContextData[key.name] = context.get(key);
      }
    }
    return new ActionContext(newContextData);
  }

  public setContextEntry<V>(key: IActionContextKey<V>, value: any): BindingsRaw {
    return this.setContextEntryRaw(key, value);
  }

  public setContextEntryRaw<V>(key: IActionContextKey<V>, value: any): BindingsRaw {
    if (this.contextHolder && this.contextHolder.context) {
      return new BindingsRaw(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context.set(key, value),
        },
      );
    }
    return new BindingsRaw(
      this.dataFactory,
      this.entries,
      {
        contextMergeHandlers: this.contextHolder?.contextMergeHandlers ?? {},
        context: new ActionContext().set(key, value),
      },
    );
  }

  public deleteContextEntry<V>(key: IActionContextKey<V>): BindingsRaw {
    return this.deleteContextEntryRaw(key);
  }

  public deleteContextEntryRaw<V>(key: IActionContextKey<V>): BindingsRaw {
    if (this.contextHolder) {
      return new BindingsRaw(
        this.dataFactory,
        this.entries,
        {
          contextMergeHandlers: this.contextHolder.contextMergeHandlers,
          context: this.contextHolder.context?.delete(key),
        },
      );
    }
    return new BindingsRaw(this.dataFactory, this.entries);
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
