import type * as LRUCache from 'lru-cache';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type * as E from '../expressions';
import { isLiteralTermExpression } from '../expressions';
import type { KnownLiteralTypes } from '../util/Consts';
import { TypeURL } from '../util/Consts';
import type { ISuperTypeProvider, OverrideType,
  GeneralSuperTypeDict } from '../util/TypeHandling';
import {
  superTypeDictTable,
  getSuperTypes,
  asKnownLiteralType, asOverrideType, asGeneralType,
} from '../util/TypeHandling';
import type { ExperimentalArgumentType } from './Core';
import { double, float, string } from './Helpers';

export type SearchStack = OverloadTree[];
export type ImplementationFunction = (sharedContext: ICompleteSharedContext) => E.SimpleApplication;
export type OverLoadCache = LRUCache<string, ImplementationFunction | undefined>;
/**
 * Maps argument types on their specific implementation in a tree like structure.
 * When adding any functionality to this class, make sure you add it to SpecialFunctions as well.
 */
export class OverloadTree {
  private implementation?: ImplementationFunction | undefined;
  // We need this field. e.g. decimal decimal should be kept even when double double is added.
  // We use promotion count to check priority.
  private promotionCount?: number | undefined;
  private readonly generalOverloads: Record<'term' | E.TermType, OverloadTree>;
  private readonly literalOverLoads: [OverrideType, OverloadTree][];
  private readonly depth: number;

  public constructor(private readonly identifier: string, depth?: number) {
    this.implementation = undefined;
    this.generalOverloads = Object.create(null);
    this.literalOverLoads = [];
    this.depth = depth || 0;
    this.promotionCount = undefined;
  }

  private getSubtree(overrideType: ExperimentalArgumentType): OverloadTree | undefined {
    const generalType = asGeneralType(overrideType);
    if (generalType) {
      return this.generalOverloads[generalType];
    }
    for (const [ type, overloadTree ] of this.literalOverLoads) {
      if (overrideType === type) {
        return overloadTree;
      }
    }
    return undefined;
  }

  /**
   * Get the implementation for the types that exactly match @param args .
   */
  public getImplementationExact(args: ExperimentalArgumentType[]): ImplementationFunction | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
    let node: OverloadTree | undefined = this;
    for (const expression of args) {
      node = node.getSubtree(expression);
      if (!node) {
        return undefined;
      }
    }
    return node.implementation;
  }

  private getOverloadCacheIdentifier(args: E.TermExpression[]): string {
    return this.identifier + args.map(term => {
      const literalExpression = isLiteralTermExpression(term);
      return literalExpression ? literalExpression.dataType : term.termType;
    }).join('');
  }

  /**
   * Searches in a depth first way for the best matching overload. considering this a the tree's root.
   * @param args:
   * @param overloadCache
   * @param superTypeProvider
   */
  public search(args: E.TermExpression[], superTypeProvider: ISuperTypeProvider, overloadCache: OverLoadCache):
  ImplementationFunction | undefined {
    const identifier = this.getOverloadCacheIdentifier(args);
    if (overloadCache.has(identifier)) {
      return overloadCache.get(identifier);
    }
    // SearchStack is a stack of all node's that need to be checked for implementation.
    // It provides an easy way to keep order in our search.
    const searchStack: { node: OverloadTree; index: number }[] = [];
    const startIndex = 0;
    if (args.length === 0) {
      return this.implementation;
    }
    // GetSubTreeWithArg return a SearchStack containing the node's that should be contacted next.
    // We also log the index since there is no other way to remember this index.
    // the provided stack should be pushed on top of our search stack since it also has it's order.
    searchStack.push(...this.getSubTreeWithArg(args[startIndex], superTypeProvider).map(node =>
      ({ node, index: startIndex + 1 })));
    while (searchStack.length > 0) {
      const { index, node } = <{ node: OverloadTree; index: number }>searchStack.pop();
      // We check the implementation because it would be possible a path is created but not implemented.
      // ex: f(double, double, double) and f(term, term). and calling f(double, double).
      if (index === args.length && node.implementation) {
        overloadCache.set(identifier, node.implementation);
        return node.implementation;
      }
      searchStack.push(...node.getSubTreeWithArg(args[index], superTypeProvider).map(item =>
        ({ node: item, index: index + 1 })));
    }
    // Calling a function with one argument but finding no implementation should return no implementation.
    // Not even the one with no arguments.
    overloadCache.set(identifier, undefined);
    return undefined;
  }

  /**
   * Adds an overload to the tree structure considering this as the tree's root.
   * @param ExperimentalArgumentTypes a list of ExperimentalArgumentTypes that would need to be provided in
   * the same order to get the implementation.
   * @param func the implementation for this overload.
   */
  public addOverload(ExperimentalArgumentTypes: ExperimentalArgumentType[], func: ImplementationFunction): void {
    this._addOverload([ ...ExperimentalArgumentTypes ], func, 0);
  }

  private _addOverload(ExperimentalArgumentTypes: ExperimentalArgumentType[],
    func: ImplementationFunction, promotionCount: number): void {
    const [ experimentalArgumentType, ..._experimentalArgumentTypes ] = ExperimentalArgumentTypes;
    if (!experimentalArgumentType) {
      if (this.promotionCount === undefined || promotionCount <= this.promotionCount) {
        this.promotionCount = promotionCount;
        this.implementation = func;
      }
      return;
    }
    let nextTree = this.getSubtree(experimentalArgumentType);
    if (!nextTree) {
      const newNode = new OverloadTree(this.identifier, this.depth + 1);
      const generalType = asGeneralType(experimentalArgumentType);
      if (generalType) {
        this.generalOverloads[generalType] = newNode;
      }
      const overrideType = asOverrideType(experimentalArgumentType);
      if (overrideType) {
        this.literalOverLoads.push([ overrideType, newNode ]);
      }
      nextTree = newNode;
    }
    nextTree._addOverload(_experimentalArgumentTypes, func, promotionCount);
    // Defined by https://www.w3.org/TR/xpath-31/#promotion .
    // e.g. When a function takes a string, it can also accept a XSD_ANY_URI if it's cast first.
    // TODO: When promoting decimal type a cast needs to be preformed.
    if (experimentalArgumentType === TypeURL.XSD_STRING) {
      this.addPromotedOverload(TypeURL.XSD_ANY_URI, func, arg =>
        string(arg.str()), _experimentalArgumentTypes, promotionCount);
    }
    // TODO: in case of decimal a round needs to happen.
    if (experimentalArgumentType === TypeURL.XSD_DOUBLE) {
      this.addPromotedOverload(TypeURL.XSD_FLOAT, func, arg =>
        double((<E.NumericLiteral>arg).typedValue), _experimentalArgumentTypes, promotionCount);
      this.addPromotedOverload(TypeURL.XSD_DECIMAL, func, arg =>
        double((<E.NumericLiteral>arg).typedValue), _experimentalArgumentTypes, promotionCount);
    }
    if (experimentalArgumentType === TypeURL.XSD_FLOAT) {
      this.addPromotedOverload(TypeURL.XSD_DECIMAL, func, arg =>
        float((<E.NumericLiteral>arg).typedValue), _experimentalArgumentTypes, promotionCount);
    }
  }

  private addPromotedOverload(typeToPromote: OverrideType, func: ImplementationFunction,
    conversionFunction: (arg: E.TermExpression) => E.TermExpression,
    ExperimentalArgumentTypes: ExperimentalArgumentType[], promotionCount: number): void {
    let nextTree = this.getSubtree(typeToPromote);
    if (!nextTree) {
      const newNode = new OverloadTree(this.identifier, this.depth + 1);
      this.literalOverLoads.push([ typeToPromote, newNode ]);
      nextTree = newNode;
    }
    nextTree._addOverload(ExperimentalArgumentTypes, funcConf => args => func(funcConf)([
      ...args.slice(0, this.depth),
      conversionFunction(args[this.depth]),
      ...args.slice(this.depth + 1, args.length),
    ]), promotionCount + 1);
  }

  /**
   * @param arg term to try and match to possible overloads of this node.
   * @returns SearchStack a stack with top element the next node that should be asked for implementation or overload.
   */
  private getSubTreeWithArg(arg: E.TermExpression, openWorldType: ISuperTypeProvider): SearchStack {
    const res: SearchStack = [];
    const literalExpression = isLiteralTermExpression(arg);
    // These types refer to Type exported by lib/util/Consts.ts
    if (this.generalOverloads.term) {
      res.push(this.generalOverloads.term);
    }
    // TermTypes are defined in E.TermType.
    if (this.generalOverloads[arg.termType]) {
      res.push(this.generalOverloads[arg.termType]);
    }
    if (literalExpression) {
      // Defending implementation. Mainly the scary sort.
      // This function has cost O(n) + O(m * log(m)) with n = amount of overloads and m = amount of matched overloads
      // We map over each of the overloads, filter only the once that can be used (this is normally 1 or 2).
      // The sort function on an array with 1 or 2 arguments will be negligible.
      const concreteType = asKnownLiteralType(literalExpression.dataType);
      let subExtensionTable: GeneralSuperTypeDict;
      if (concreteType) {
        // Concrete dataType is known by sparqlee.
        subExtensionTable = superTypeDictTable[concreteType];
      } else {
        // Datatype is a custom datatype
        subExtensionTable = getSuperTypes(literalExpression.dataType, openWorldType);
      }
      const matches: [number, OverloadTree][] = this.literalOverLoads.filter(([ matchType, _ ]) =>
        matchType in subExtensionTable)
        .map(([ matchType, tree ]) => [ subExtensionTable[<KnownLiteralTypes> matchType], tree ]);
      matches.sort(([ prioA, matchTypeA ], [ prioB, matchTypeB ]) => prioA - prioB);
      res.push(...matches.map(([ _, sortedType ]) => sortedType));
    }
    return res;
  }
}

