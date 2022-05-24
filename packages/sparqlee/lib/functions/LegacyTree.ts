import type * as E from '../expressions';
import { isLiteralTermExpression } from '../expressions';
import { mainSparqlType } from '../util/TypeHandling';
import type { ArgumentType, ExperimentalArgumentType } from './Core';
import type { ImplementationFunction } from './OverloadTree';

type SearchStack = LegacyTree[];

/**
 * Maps argument types on their specific implementation in a tree like structure.
 * When adding any functionality to this class, make sure you add it to SpecialFunctions as well.
 */
export class LegacyTree {
  private implementation?: ImplementationFunction | undefined;
  private readonly legacyImportance: number;
  private readonly subTrees: Record<ArgumentType, LegacyTree>;

  public constructor(legacyImportance?: number) {
    this.implementation = undefined;
    this.subTrees = Object.create(null);
    this.legacyImportance = legacyImportance || 0;
  }

  /**
   * Searches in a depth first way for the best matching overload. considering this a the tree's root.
   * @param args
   */
  public search(args: E.TermExpression[]): ImplementationFunction | undefined {
    // SearchStack is a stack of all node's that need to be checked for implementation.
    // It provides an easy way to keep order in our search.
    const searchStack: { node: LegacyTree; index: number }[] = [];
    const startIndex = 0;
    if (args.length === 0) {
      return this.implementation;
    }
    // GetSubTreeWithArg return a SearchStack containing the node's that should be contacted next.
    // We also log the index since there is no other way to remember this index.
    // the provided stack should be pushed on top of our search stack since it also has it's order.
    searchStack.push(...this.getSubTreeWithArg(args[startIndex]).map(node => ({ node, index: startIndex + 1 })));
    while (searchStack.length > 0) {
      const { index, node } = <{ node: LegacyTree; index: number }>searchStack.pop();
      if (index === args.length) {
        return node.implementation;
      }
      searchStack.push(...node.getSubTreeWithArg(args[index]).map(item =>
        ({ node: item, index: index + 1 })));
    }
    return this.implementation;
  }

  /**
   * Adds an overload to the tree structure considering this as the tree's root.
   * @param argumentTypes a list of ArgumentTypes that would need to be provided in the same order to
   * get the implementation.
   * @param func the implementation for this overload.
   */
  public addOverload(argumentTypes: ExperimentalArgumentType[], func: ImplementationFunction): void {
    this._addOverload([ ...argumentTypes ], func, false, 0);
  }

  public addLegacyOverload(argumentTypes: ExperimentalArgumentType[], func: ImplementationFunction): void {
    this._addOverload([ ...argumentTypes ], func, true, 0);
  }

  private _addOverload(argumentTypes: ExperimentalArgumentType[], func: ImplementationFunction,
    alwaysOverride: boolean, prevPrio: number): void {
    const [ argumentType, ..._argumentTypes ] = argumentTypes;
    if (!argumentType) {
      if (alwaysOverride || this.legacyImportance <= prevPrio) {
        this.implementation = func;
      }
      return;
    }
    const holder = mainSparqlType(argumentType);
    for (const mainType of holder.types) {
      if (alwaysOverride || !this.subTrees[mainType]) {
        this.subTrees[mainType] = new LegacyTree(holder.prio);
      }
      this.subTrees[mainType]._addOverload(_argumentTypes, func, alwaysOverride, holder.prio);
    }
  }

  /**
   * @param arg term to try and match to possible overloads of this node.
   * @returns SearchStack a stack with top element the next node that should be asked for implementation or overload.
   */
  private getSubTreeWithArg(arg: E.TermExpression): SearchStack {
    const literalExpression = isLiteralTermExpression(arg);
    const res: SearchStack = [];
    // These types refer to Type exported by lib/util/Consts.ts
    if (this.subTrees.term) {
      res.push(this.subTrees.term);
    }
    // TermTypes are defined in E.TermType.
    if (this.subTrees[arg.termType]) {
      res.push(this.subTrees[arg.termType]);
    }
    if (literalExpression && this.subTrees[literalExpression.mainSparqlType]) {
      res.push(this.subTrees[literalExpression.mainSparqlType]);
    }
    return res;
  }
}

