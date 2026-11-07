import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActionContext } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IActionContextKey } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BindingsShape } from './BindingsShape';
import { bindingsToString } from './bindingsToString';

/**
 * A dictionary with which the encoded values of bindings can be decoded.
 *
 * Encodings must be primitive values (such as numbers), and every term must have a single encoding,
 * so that two encodings of the same dictionary are equal exactly if their terms are equal.
 */
export interface IBindingsDictionary {
  decode: (encoding: any) => RDF.Term;
}

/**
 * A value of a bindings object: a term, or the encoding of a term in the dictionary of the bindings object.
 */
export type BindingsValue = RDF.Term | number | string | symbol;

/**
 * A Bindings object that stores its values in a plain array, in the order of the variables of a shared shape.
 * Values that come from an RDF store can be kept in the encoding of that store's dictionary,
 * so that they are only decoded when they are read, and compared without decoding them.
 *
 * Bindings are never modified after construction. Modifications copy the values.
 */
export class Bindings implements RDF.Bindings {
  public readonly type = 'bindings';

  private readonly dataFactory: ComunicaDataFactory;
  /**
   * The variables of this bindings object, in the order of `rawValues`.
   */
  public readonly shape: BindingsShape;
  /**
   * The values in the order of the shape, of which those that are not RDF terms are encodings in `dictionary`.
   */
  public readonly rawValues: readonly BindingsValue[];
  /**
   * The dictionary of the encoded values, which is only undefined if all values are RDF terms.
   */
  public readonly dictionary: IBindingsDictionary | undefined;
  private readonly contextHolder: IContextHolder | undefined;

  /**
   * @param dataFactory The data factory.
   * @param entries Either a map of variable names to terms, or a shape of which `values` contains the values.
   * @param contextHolder An optional context.
   * @param values If `entries` is a shape, the values in its order.
   * @param dictionary If `entries` is a shape, the dictionary of the encoded values, if there are any.
   */
  public constructor(
    dataFactory: ComunicaDataFactory,
    entries: ReadonlyMap<string, RDF.Term> | BindingsShape,
    contextHolder?: IContextHolder,
    values?: readonly BindingsValue[],
    dictionary?: IBindingsDictionary,
  ) {
    this.dataFactory = dataFactory;
    if (entries instanceof BindingsShape) {
      this.shape = entries;
      this.rawValues = values!;
      this.dictionary = dictionary;
    } else {
      this.shape = BindingsShape.of([ ...entries.keys() ]);
      this.rawValues = [ ...entries.values() ];
      this.dictionary = undefined;
    }
    this.contextHolder = contextHolder;
  }

  /**
   * Create an array of exactly the given length.
   * Growing an array by pushing to it leaves spare capacity behind,
   * which every retained bindings object would keep.
   * @param length The length of the array.
   */
  public static allocateValues(length: number): BindingsValue[] {
    // eslint-disable-next-line unicorn/no-new-array
    return new Array<BindingsValue>(length);
  }

  /**
   * Decode a value.
   * @param value A value.
   * @param dictionary The dictionary of the value, if it is encoded.
   */
  public static decode(value: BindingsValue, dictionary: IBindingsDictionary | undefined): RDF.Term {
    return typeof value === 'object' ? value : dictionary!.decode(value);
  }

  /**
   * Check if two values represent the same term.
   * @param left A value.
   * @param leftDictionary The dictionary of the left value.
   * @param right A value.
   * @param rightDictionary The dictionary of the right value.
   */
  public static valuesEqual(
    left: BindingsValue,
    leftDictionary: IBindingsDictionary | undefined,
    right: BindingsValue,
    rightDictionary: IBindingsDictionary | undefined,
  ): boolean {
    if (typeof left === 'object') {
      return left === right || left.equals(Bindings.decode(right, rightDictionary));
    }
    if (typeof right === 'object') {
      return leftDictionary!.decode(left).equals(right);
    }
    if (leftDictionary === rightDictionary) {
      return left === right;
    }
    return leftDictionary!.decode(left).equals(rightDictionary!.decode(right));
  }

  /**
   * The term at the given position.
   * @param index A position in the values.
   */
  protected termAt(index: number): RDF.Term {
    const value = this.rawValues[index];
    return typeof value === 'object' ? value : this.dictionary!.decode(value);
  }

  protected create(
    shape: BindingsShape,
    values: readonly BindingsValue[],
    dictionary: IBindingsDictionary | undefined,
    contextHolder?: IContextHolder,
  ): Bindings {
    return new Bindings(this.dataFactory, shape, contextHolder, values, dictionary);
  }

  public has(key: RDF.Variable | string): boolean {
    return this.shape.indexOf(typeof key === 'string' ? key : key.value) !== undefined;
  }

  public get(key: RDF.Variable | string): RDF.Term | undefined {
    const index = this.shape.indexOf(typeof key === 'string' ? key : key.value);
    if (index === undefined) {
      return undefined;
    }
    const value = this.rawValues[index];
    return typeof value === 'object' ? value : this.dictionary!.decode(value);
  }

  public set(key: RDF.Variable | string, value: RDF.Term): Bindings {
    const name = typeof key === 'string' ? key : key.value;
    const index = this.shape.indexOf(name);
    const length = this.rawValues.length;
    const values = Bindings.allocateValues(index === undefined ? length + 1 : length);
    for (let i = 0; i < length; i++) {
      values[i] = this.rawValues[i];
    }
    if (index === undefined) {
      values[length] = value;
      return this.create(this.shape.append(name), values, this.dictionary, this.contextHolder);
    }
    values[index] = value;
    return this.create(this.shape, values, this.dictionary, this.contextHolder);
  }

  public delete(key: RDF.Variable | string): Bindings {
    const index = this.shape.indexOf(typeof key === 'string' ? key : key.value);
    if (index === undefined) {
      return this.create(this.shape, this.rawValues, this.dictionary, this.contextHolder);
    }
    const keep: number[] = [];
    let mask = 0;
    for (let i = 0; i < this.shape.size; i++) {
      if (i !== index) {
        keep.push(i);
        mask |= 1 << i;
      }
    }
    return this.subset(keep, this.shape.size <= 31 ? mask : undefined);
  }

  /**
   * Keep only the values at the given positions.
   * @param keep Positions in ascending order.
   * @param mask The bitmask of these positions, if the shape has at most 31 variables.
   */
  protected subset(keep: number[], mask: number | undefined): Bindings {
    const plan = this.shape.getSubsetPlan(keep, mask);
    const values = Bindings.allocateValues(plan.keep.length);
    for (let i = 0; i < plan.keep.length; i++) {
      values[i] = this.rawValues[plan.keep[i]];
    }
    return this.create(plan.shape, values, this.dictionary, this.contextHolder);
  }

  public keys(): Iterable<RDF.Variable> {
    return this.shape.getVariables(this.dataFactory);
  }

  public values(): Iterable<RDF.Term> {
    // Without a dictionary, all values are terms already.
    if (this.dictionary === undefined) {
      return <readonly RDF.Term[]> this.rawValues;
    }
    const terms = <RDF.Term[]> Bindings.allocateValues(this.rawValues.length);
    for (let i = 0; i < terms.length; i++) {
      terms[i] = this.termAt(i);
    }
    return terms;
  }

  public forEach(fn: (value: RDF.Term, key: RDF.Variable) => any): void {
    const variables = this.shape.getVariables(this.dataFactory);
    for (const [ i, variable ] of variables.entries()) {
      fn(this.termAt(i), variable);
    }
  }

  public get size(): number {
    return this.shape.size;
  }

  public [Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    const variables = this.shape.getVariables(this.dataFactory);
    const entries: [RDF.Variable, RDF.Term][] = [];
    for (const [ i, variable ] of variables.entries()) {
      entries.push([ variable, this.termAt(i) ]);
    }
    return entries[Symbol.iterator]();
  }

  public equals(other: RDF.Bindings | null | undefined): boolean {
    if (!other) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (this.size !== other.size) {
      return false;
    }

    // Values of the same shape can be compared position by position.
    if (other instanceof Bindings && other.shape === this.shape) {
      for (let i = 0; i < this.rawValues.length; i++) {
        if (!Bindings.valuesEqual(this.rawValues[i], this.dictionary, other.rawValues[i], other.dictionary)) {
          return false;
        }
      }
      return true;
    }

    const variables = this.shape.getVariables(this.dataFactory);
    for (const [ i, variable ] of variables.entries()) {
      const right = other.get(variable);
      if (!right || !this.termAt(i).equals(right)) {
        return false;
      }
    }
    return true;
  }

  public filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean): Bindings {
    const variables = this.shape.getVariables(this.dataFactory);
    const keep: number[] = [];
    let mask = 0;
    for (const [ i, variable ] of variables.entries()) {
      if (fn(this.termAt(i), variable)) {
        keep.push(i);
        mask |= 1 << i;
      }
    }
    if (keep.length === variables.length) {
      return this.create(this.shape, this.rawValues, this.dictionary, this.contextHolder);
    }
    return this.subset(keep, variables.length <= 31 ? mask : undefined);
  }

  public map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term): Bindings {
    const variables = this.shape.getVariables(this.dataFactory);
    const values: BindingsValue[] = [];
    for (const [ i, variable ] of variables.entries()) {
      values.push(fn(this.termAt(i), variable));
    }
    return this.create(this.shape, values, undefined, this.contextHolder);
  }

  public merge(other: RDF.Bindings | Bindings): Bindings | undefined {
    if (!(other instanceof Bindings)) {
      return this.mergeWithRdfJs(undefined, other);
    }

    const plan = this.shape.getMergePlan(other.shape);
    const leftValues = this.rawValues;
    const rightValues = other.rawValues;
    const leftDictionary = this.dictionary;
    const rightDictionary = other.dictionary;

    // Check the shared variables
    const overlapLeft = plan.overlapLeft;
    const overlapRight = plan.overlapRight;
    for (const [ i, element ] of overlapLeft.entries()) {
      const left = leftValues[element];
      const right = rightValues[overlapRight[i]];
      if ((left !== right || leftDictionary !== rightDictionary) &&
        !Bindings.valuesEqual(left, leftDictionary, right, rightDictionary)) {
        return;
      }
    }

    const [ values, dictionary ] = this.appendValues(plan.extraRight, other);
    return this.createBindingsWithContexts(plan.shape, values, dictionary, other);
  }

  /**
   * Append the given values of other bindings to the values of this one.
   * Values can only be encoded in a single dictionary, so encodings of another dictionary are decoded.
   * @param extra Positions in the values of the other bindings.
   * @param other Other bindings.
   */
  protected appendValues(
    extra: number[],
    other: Bindings,
  ): [ readonly BindingsValue[], IBindingsDictionary | undefined ] {
    if (extra.length === 0) {
      return [ this.rawValues, this.dictionary ];
    }
    const leftValues = this.rawValues;
    const rightValues = other.rawValues;
    const length = leftValues.length;
    const values = Bindings.allocateValues(length + extra.length);
    for (let i = 0; i < length; i++) {
      values[i] = leftValues[i];
    }
    // Without a dictionary, all values of this bindings object are terms, so the other dictionary can be taken over.
    const dictionary = this.dictionary ?? other.dictionary;
    let target = length;
    if (dictionary === other.dictionary) {
      for (const index of extra) {
        values[target++] = rightValues[index];
      }
    } else {
      for (const index of extra) {
        values[target++] = Bindings.decode(rightValues[index], other.dictionary);
      }
    }
    return [ values, dictionary ];
  }

  public mergeWith(
    merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term,
    other: RDF.Bindings | Bindings,
  ): Bindings {
    if (!(other instanceof Bindings)) {
      return this.mergeWithRdfJs(merger, other)!;
    }

    const plan = this.shape.getMergePlan(other.shape);
    const [ appended, dictionary ] = this.appendValues(plan.extraRight, other);
    let values = appended;

    // Resolve conflicts on the shared variables
    const overlapLeft = plan.overlapLeft;
    const overlapRight = plan.overlapRight;
    let copied = values !== this.rawValues;
    for (const [ i, element ] of overlapLeft.entries()) {
      const left = this.rawValues[element];
      const right = other.rawValues[overlapRight[i]];
      if (!Bindings.valuesEqual(left, this.dictionary, right, other.dictionary)) {
        if (!copied) {
          values = [ ...values ];
          copied = true;
        }
        (<BindingsValue[]> values)[element] = merger(
          this.termAt(element),
          Bindings.decode(right, other.dictionary),
          this.shape.getVariables(this.dataFactory)[element],
        );
      }
    }

    return this.createBindingsWithContexts(plan.shape, values, dictionary, other);
  }

  /**
   * Merge with bindings of another implementation.
   * @param merger A function to resolve conflicts with, or undefined if conflicts make the merge fail.
   * @param other Other bindings.
   */
  protected mergeWithRdfJs(
    merger: ((self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term) | undefined,
    other: RDF.Bindings,
  ): Bindings | undefined {
    let shape = this.shape;
    let values: BindingsValue[] | undefined;
    for (const [ variable, right ] of other) {
      const index = this.shape.indexOf(variable.value);
      if (index === undefined) {
        values ??= [ ...this.rawValues ];
        values.push(right);
        shape = shape.append(variable.value);
      } else {
        const left = this.termAt(index);
        if (!left.equals(right)) {
          if (!merger) {
            return;
          }
          values ??= [ ...this.rawValues ];
          values[index] = merger(left, right, variable);
        }
      }
    }
    return this.createBindingsWithContexts(shape, values ?? this.rawValues, this.dictionary, other);
  }

  protected createBindingsWithContexts(
    shape: BindingsShape,
    values: readonly BindingsValue[],
    dictionary: IBindingsDictionary | undefined,
    other: RDF.Bindings | Bindings,
  ): Bindings {
    // If any context is empty, we skip merging contexts
    if (this.contextHolder && this.contextHolder.context) {
      let mergedContext = this.contextHolder.context;
      // Only merge if the other has a context
      if ('contextHolder' in other && other.contextHolder && other.contextHolder.context) {
        mergedContext = Bindings
          .mergeContext(this.contextHolder.contextMergeHandlers, mergedContext, other.contextHolder.context);
      }
      return this.create(
        shape,
        values,
        dictionary,
        { contextMergeHandlers: this.contextHolder.contextMergeHandlers, context: mergedContext },
      );
    }

    // Otherwise, use optional context from other
    return this.create(shape, values, dictionary, (<Bindings> other).contextHolder);
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
      return this.create(this.shape, this.rawValues, this.dictionary, {
        contextMergeHandlers: this.contextHolder.contextMergeHandlers,
        context: this.contextHolder.context.set(key, value),
      });
    }
    return this.create(this.shape, this.rawValues, this.dictionary, {
      contextMergeHandlers: this.contextHolder?.contextMergeHandlers ?? {},
      context: new ActionContext().set(key, value),
    });
  }

  public deleteContextEntry<V>(key: IActionContextKey<V>): Bindings {
    return this.deleteContextEntryRaw(key);
  }

  public deleteContextEntryRaw<V>(key: IActionContextKey<V>): Bindings {
    if (this.contextHolder) {
      return this.create(this.shape, this.rawValues, this.dictionary, {
        contextMergeHandlers: this.contextHolder.contextMergeHandlers,
        context: this.contextHolder.context?.delete(key),
      });
    }
    return this.create(this.shape, this.rawValues, this.dictionary);
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
}

export interface IContextHolder {
  contextMergeHandlers: Record<string, IBindingsContextMergeHandler<any>>;
  context?: IActionContext;
}
