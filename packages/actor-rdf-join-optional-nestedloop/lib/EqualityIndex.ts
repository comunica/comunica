import type { Bindings, MetadataBindings } from '@comunica/types';
import { Algebra, isKnownSubType } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const NUMERIC_DATATYPES = new Set([
  'integer',
  'decimal',
  'float',
  'double',
  'nonPositiveInteger',
  'negativeInteger',
  'long',
  'int',
  'short',
  'byte',
  'nonNegativeInteger',
  'unsignedLong',
  'unsignedInt',
  'unsignedShort',
  'unsignedByte',
  'positiveInteger',
].map(type => `${XSD}${type}`));

/**
 * An index of the right-hand bindings of a left join by the value of a variable,
 * which the join expression requires to be equal to a variable of the left-hand bindings.
 *
 * For a left-hand binding, it returns only the right-hand bindings that may satisfy that equality,
 * in their original order, so that the expression does not have to be evaluated for all pairs.
 */
export class EqualityIndex {
  private readonly bindings: Bindings[];
  private readonly leftVariable: RDF.Variable;
  private readonly buckets = new Map<string, number[]>();
  private readonly unkeyed: number[] = [];

  /**
   * @param bindings The right-hand bindings.
   * @param leftVariable The variable of the left-hand bindings.
   * @param rightVariable The variable of the right-hand bindings that must be equal to it.
   */
  public constructor(bindings: Bindings[], leftVariable: RDF.Variable, rightVariable: RDF.Variable) {
    this.bindings = bindings;
    this.leftVariable = leftVariable;
    for (const [ index, binding ] of bindings.entries()) {
      const key = EqualityIndex.valueKey(binding.get(rightVariable));
      if (key === null) {
        this.unkeyed.push(index);
      } else if (key !== undefined) {
        let bucket = this.buckets.get(key);
        if (!bucket) {
          bucket = [];
          this.buckets.set(key, bucket);
        }
        bucket.push(index);
      }
    }
  }

  /**
   * Determine a key that is the same for all terms that are equal according to SPARQL's = operator.
   * Unequal terms may share a key.
   * @param term A term, or undefined if unbound.
   * @return The key, null if no key can be determined, so that the term must be compared with all others,
   *         or undefined if the term is unbound, so that it is equal to no other.
   */
  public static valueKey(term: RDF.Term | undefined): string | null | undefined {
    if (!term) {
      return undefined;
    }
    switch (term.termType) {
      case 'NamedNode':
        return `I${term.value}`;
      case 'BlankNode':
        return `B${term.value}`;
      case 'Literal':
        if (term.language) {
          return `S${term.value}@${term.language.toLowerCase()}`;
        }
        if (term.datatype.value === `${XSD}string`) {
          return `S${term.value}@`;
        }
        if (NUMERIC_DATATYPES.has(term.datatype.value)) {
          const value = Number(term.value);
          return Number.isNaN(value) ? null : `N${value}`;
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Find an equality between a variable of the left-hand bindings and one of the right-hand bindings,
   * that must hold for the expression to be true.
   * @param expression A join expression.
   * @param metadatas The metadata of the left-hand and right-hand entries.
   * @return The left-hand and right-hand variable, or undefined if there is no such equality.
   */
  public static findEquality(
    expression: Algebra.Expression,
    metadatas: MetadataBindings[],
  ): [RDF.Variable, RDF.Variable] | undefined {
    const [ left, right ] = metadatas.map(metadata => new Set(metadata.variables
      .map(variable => variable.variable.value)));
    const isOnlyIn = (variable: RDF.Variable, own: Set<string>, other: Set<string>): boolean =>
      own.has(variable.value) && !other.has(variable.value);
    if (!isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR)) {
      return;
    }
    // An equality within a conjunction must hold as well
    if (expression.operator === '&&') {
      for (const arg of expression.args) {
        const equality = EqualityIndex.findEquality(arg, metadatas);
        if (equality) {
          return equality;
        }
      }
      return;
    }
    if (expression.operator !== '=') {
      return;
    }
    const [ first, second ] = expression.args.map(arg => isKnownSubType(arg, Algebra.ExpressionTypes.TERM) &&
      arg.term.termType === 'Variable' ?
      arg.term :
      undefined);
    if (!first || !second) {
      return;
    }
    if (isOnlyIn(first, left, right) && isOnlyIn(second, right, left)) {
      return [ first, second ];
    }
    if (isOnlyIn(second, left, right) && isOnlyIn(first, right, left)) {
      return [ second, first ];
    }
  }

  /**
   * The right-hand bindings that may satisfy the equality for the given left-hand binding, in their original order.
   * @param left A left-hand binding.
   */
  public* candidates(left: Bindings): Iterable<Bindings> {
    const key = EqualityIndex.valueKey(left.get(this.leftVariable));
    if (key === undefined) {
      return;
    }
    if (key === null) {
      yield* this.bindings;
      return;
    }
    // Merge the bucket of this key with the unkeyed bindings, which are both sorted by their original position
    const bucket = this.buckets.get(key) ?? [];
    let i = 0;
    let j = 0;
    while (i < bucket.length || j < this.unkeyed.length) {
      if (j >= this.unkeyed.length || (i < bucket.length && bucket[i] < this.unkeyed[j])) {
        yield this.bindings[bucket[i++]];
      } else {
        yield this.bindings[this.unkeyed[j++]];
      }
    }
  }
}
