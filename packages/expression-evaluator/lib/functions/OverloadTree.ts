import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type * as E from '../expressions';
import { isLiteralTermExpression } from '../expressions';
import type { KnownLiteralTypes } from '../util/Consts';
import type { GeneralSuperTypeDict, ISuperTypeProvider, OverrideType } from '../util/TypeHandling';
import {
  asGeneralType,
  asKnownLiteralType,
  asOverrideType,
  getSuperTypes,
  superTypeDictTable, typePromotion,
} from '../util/TypeHandling';
import type { ArgumentType } from './Core';

export type SearchStack = OverloadTree[];
export type ImplementationFunction = (sharedContext: ICompleteSharedContext) => E.SimpleApplication;
interface IFunctionArgumentsCacheObj {
  func?: ImplementationFunction; cache?: FunctionArgumentsCache;
}
export type FunctionArgumentsCache = Record<string, IFunctionArgumentsCacheObj>;
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

  private getSubtree(overrideType: ArgumentType): OverloadTree | undefined {
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
  public getImplementationExact(args: ArgumentType[]): ImplementationFunction | undefined {
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

  /**
   * Searches in a depth first way for the best matching overload. considering this a the tree's root.
   * @param args the arguments to the function.
   * @param functionArgumentsCache
   * @param superTypeProvider
   */
  public search(args: E.TermExpression[], superTypeProvider: ISuperTypeProvider,
    functionArgumentsCache: FunctionArgumentsCache):
    ImplementationFunction | undefined {
    let cacheIter: IFunctionArgumentsCacheObj | undefined = functionArgumentsCache[this.identifier];
    let searchIndex = 0;
    while (searchIndex < args.length && cacheIter?.cache) {
      const term = args[searchIndex];
      const literalExpression = isLiteralTermExpression(term);
      cacheIter = cacheIter.cache[literalExpression ? literalExpression.dataType : term.termType];
      searchIndex++;
    }
    if (searchIndex === args.length && cacheIter?.func) {
      return cacheIter.func;
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
        this.addToCache(functionArgumentsCache, args, node.implementation);
        return node.implementation;
      }
      searchStack.push(...node.getSubTreeWithArg(args[index], superTypeProvider).map(item =>
        ({ node: item, index: index + 1 })));
    }
    // Calling a function with one argument but finding no implementation should return no implementation.
    // Not even the one with no arguments.
    return undefined;
  }

  private addToCache(functionArgumentsCache: FunctionArgumentsCache, args: E.TermExpression[],
    func?: ImplementationFunction | undefined): void {
    function getDefault(lruCache: FunctionArgumentsCache, key: string): IFunctionArgumentsCacheObj {
      if (!(key in lruCache)) {
        lruCache[key] = { };
      }
      return lruCache[key]!;
    }
    let cache = getDefault(functionArgumentsCache, this.identifier);
    for (const term of args) {
      const literalExpression = isLiteralTermExpression(term);
      const key = literalExpression ? literalExpression.dataType : term.termType;
      cache.cache = cache.cache || {};
      cache = getDefault(cache.cache, key);
    }
    cache.func = func;
  }

  /**
   * Adds an overload to the tree structure considering this as the tree's root.
   * @param argumentTypes a list of argumentTypes that would need to be provided in
   * the same order to get the implementation.
   * @param func the implementation for this overload.
   */
  public addOverload(argumentTypes: ArgumentType[], func: ImplementationFunction): void {
    this._addOverload([ ...argumentTypes ], func, 0);
  }

  private _addOverload(argumentTypes: ArgumentType[],
    func: ImplementationFunction, promotionCount: number): void {
    const [ argumentType, ..._argumentTypes ] = argumentTypes;
    if (!argumentType) {
      if (this.promotionCount === undefined || promotionCount <= this.promotionCount) {
        this.promotionCount = promotionCount;
        this.implementation = func;
      }
      return;
    }
    let nextTree = this.getSubtree(argumentType);
    if (!nextTree) {
      const newNode = new OverloadTree(this.identifier, this.depth + 1);
      const generalType = asGeneralType(argumentType);
      if (generalType) {
        this.generalOverloads[generalType] = newNode;
      }
      const overrideType = asOverrideType(argumentType);
      if (overrideType) {
        this.literalOverLoads.push([ overrideType, newNode ]);
      }
      nextTree = newNode;
    }
    nextTree._addOverload(_argumentTypes, func, promotionCount);

    typePromotion[argumentType]?.forEach(ret =>
      this.addPromotedOverload(
        ret.typeToPromote, func, ret.conversionFunction, _argumentTypes, promotionCount,
      ));
  }

  private addPromotedOverload(typeToPromote: OverrideType, func: ImplementationFunction,
    conversionFunction: (arg: E.TermExpression) => E.TermExpression,
    argumentTypes: ArgumentType[], promotionCount: number): void {
    let nextTree = this.getSubtree(typeToPromote);
    if (!nextTree) {
      const newNode = new OverloadTree(this.identifier, this.depth + 1);
      this.literalOverLoads.push([ typeToPromote, newNode ]);
      nextTree = newNode;
    }
    nextTree._addOverload(argumentTypes, funcConf => args => func(funcConf)([
      ...args.slice(0, this.depth),
      conversionFunction(args[this.depth]),
      ...args.slice(this.depth + 1, args.length),
    ]), promotionCount + 1);
  }

  /**
   * @param arg term to try and match to possible overloads of this node.
   * @param openWorldType interface allowing to discover relations between types.
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
        // Concrete dataType is known by expression-evaluator.
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

