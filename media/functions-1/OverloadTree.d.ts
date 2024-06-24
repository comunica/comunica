import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type * as E from '../expressions';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import type { ArgumentType } from './Core';
export type SearchStack = OverloadTree[];
export type ImplementationFunction = (sharedContext: ICompleteSharedContext) => E.SimpleApplication;
export type ImplementationFunctionTuple<T> = (sharedContext: ICompleteSharedContext) => E.SimpleApplicationTuple<T>;
interface IFunctionArgumentsCacheObj {
    func?: ImplementationFunction;
    cache?: FunctionArgumentsCache;
}
export type FunctionArgumentsCache = Record<string, IFunctionArgumentsCacheObj>;
/**
 * Maps argument types on their specific implementation in a tree like structure.
 * When adding any functionality to this class, make sure you add it to SpecialFunctions as well.
 */
export declare class OverloadTree {
    private readonly identifier;
    private implementation?;
    private promotionCount?;
    private readonly generalOverloads;
    private readonly literalOverLoads;
    private readonly depth;
    constructor(identifier: string, depth?: number);
    private getSubtree;
    /**
     * Get the implementation for the types that exactly match @param args .
     */
    getImplementationExact(args: ArgumentType[]): ImplementationFunction | undefined;
    /**
     * Searches in a depth first way for the best matching overload. considering this a the tree's root.
     * @param args the arguments to the function.
     * @param superTypeProvider
     * @param functionArgumentsCache
     */
    search(args: E.TermExpression[], superTypeProvider: ISuperTypeProvider, functionArgumentsCache: FunctionArgumentsCache): ImplementationFunction | undefined;
    private addToCache;
    /**
     * Adds an overload to the tree structure considering this as the tree's root.
     * @param argumentTypes a list of argumentTypes that would need to be provided in
     * the same order to get the implementation.
     * @param func the implementation for this overload.
     */
    addOverload(argumentTypes: ArgumentType[], func: ImplementationFunction): void;
    private _addOverload;
    private addPromotedOverload;
    /**
     * @param arg term to try and match to possible overloads of this node.
     * @param openWorldType interface allowing to discover relations between types.
     * @returns SearchStack a stack with top element the next node that should be asked for implementation or overload.
     */
    private getSubTreeWithArg;
}
export {};
