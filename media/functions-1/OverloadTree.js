"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverloadTree = void 0;
const expressions_1 = require("../expressions");
const TypeHandling_1 = require("../util/TypeHandling");
/**
 * Maps argument types on their specific implementation in a tree like structure.
 * When adding any functionality to this class, make sure you add it to SpecialFunctions as well.
 */
class OverloadTree {
    constructor(identifier, depth) {
        this.identifier = identifier;
        this.implementation = undefined;
        this.generalOverloads = Object.create(null);
        this.literalOverLoads = [];
        this.depth = depth ?? 0;
        this.promotionCount = undefined;
    }
    getSubtree(overrideType) {
        const generalType = (0, TypeHandling_1.asGeneralType)(overrideType);
        if (generalType) {
            return this.generalOverloads[generalType];
        }
        for (const [type, overloadTree] of this.literalOverLoads) {
            if (overrideType === type) {
                return overloadTree;
            }
        }
        return undefined;
    }
    /**
     * Get the implementation for the types that exactly match @param args .
     */
    getImplementationExact(args) {
        // eslint-disable-next-line ts/no-this-alias
        let node = this;
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
     * @param superTypeProvider
     * @param functionArgumentsCache
     */
    search(args, superTypeProvider, functionArgumentsCache) {
        let cacheIter = functionArgumentsCache[this.identifier];
        let searchIndex = 0;
        while (searchIndex < args.length && cacheIter?.cache) {
            const term = args[searchIndex];
            const literalExpression = (0, expressions_1.isLiteralTermExpression)(term);
            cacheIter = cacheIter.cache[literalExpression ? literalExpression.dataType : term.termType];
            searchIndex++;
        }
        if (searchIndex === args.length && cacheIter?.func) {
            return cacheIter.func;
        }
        // SearchStack is a stack of all node's that need to be checked for implementation.
        // It provides an easy way to keep order in our search.
        const searchStack = [];
        const startIndex = 0;
        if (args.length === 0) {
            return this.implementation;
        }
        // GetSubTreeWithArg return a SearchStack containing the node's that should be contacted next.
        // We also log the index since there is no other way to remember this index.
        // the provided stack should be pushed on top of our search stack since it also has it's order.
        searchStack.push(...this.getSubTreeWithArg(args[startIndex], superTypeProvider).map(node => ({ node, index: startIndex + 1 })));
        while (searchStack.length > 0) {
            const { index, node } = searchStack.pop();
            // We check the implementation because it would be possible a path is created but not implemented.
            // ex: f(double, double, double) and f(term, term). and calling f(double, double).
            if (index === args.length && node.implementation) {
                this.addToCache(functionArgumentsCache, args, node.implementation);
                return node.implementation;
            }
            searchStack.push(...node.getSubTreeWithArg(args[index], superTypeProvider).map(item => ({ node: item, index: index + 1 })));
        }
        // Calling a function with one argument but finding no implementation should return no implementation.
        // Not even the one with no arguments.
        return undefined;
    }
    addToCache(functionArgumentsCache, args, func) {
        function getDefault(lruCache, key) {
            if (!(key in lruCache)) {
                lruCache[key] = {};
            }
            return lruCache[key];
        }
        let cache = getDefault(functionArgumentsCache, this.identifier);
        for (const term of args) {
            const literalExpression = (0, expressions_1.isLiteralTermExpression)(term);
            const key = literalExpression ? literalExpression.dataType : term.termType;
            cache.cache = cache.cache ?? {};
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
    addOverload(argumentTypes, func) {
        this._addOverload([...argumentTypes], func, 0);
    }
    _addOverload(argumentTypes, func, promotionCount) {
        const [argumentType, ..._argumentTypes] = argumentTypes;
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
            const generalType = (0, TypeHandling_1.asGeneralType)(argumentType);
            if (generalType) {
                this.generalOverloads[generalType] = newNode;
            }
            const overrideType = (0, TypeHandling_1.asOverrideType)(argumentType);
            if (overrideType) {
                this.literalOverLoads.push([overrideType, newNode]);
            }
            nextTree = newNode;
        }
        nextTree._addOverload(_argumentTypes, func, promotionCount);
        if (TypeHandling_1.typePromotion[argumentType]) {
            for (const ret of TypeHandling_1.typePromotion[argumentType]) {
                this.addPromotedOverload(ret.typeToPromote, func, ret.conversionFunction, _argumentTypes, promotionCount);
            }
        }
    }
    addPromotedOverload(typeToPromote, func, conversionFunction, argumentTypes, promotionCount) {
        let nextTree = this.getSubtree(typeToPromote);
        if (!nextTree) {
            const newNode = new OverloadTree(this.identifier, this.depth + 1);
            this.literalOverLoads.push([typeToPromote, newNode]);
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
    getSubTreeWithArg(arg, openWorldType) {
        const res = [];
        const literalExpression = (0, expressions_1.isLiteralTermExpression)(arg);
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
            const concreteType = (0, TypeHandling_1.asKnownLiteralType)(literalExpression.dataType);
            let subExtensionTable;
            if (concreteType) {
                // Concrete dataType is known by expression-evaluator.
                subExtensionTable = TypeHandling_1.superTypeDictTable[concreteType];
            }
            else {
                // Datatype is a custom datatype
                subExtensionTable = (0, TypeHandling_1.getSuperTypes)(literalExpression.dataType, openWorldType);
            }
            const matches = this.literalOverLoads.filter(([matchType, _]) => matchType in subExtensionTable)
                .map(([matchType, tree]) => [subExtensionTable[matchType], tree]);
            // eslint-disable-next-line unused-imports/no-unused-vars
            matches.sort(([prioA, matchTypeA], [prioB, matchTypeB]) => prioA - prioB);
            res.push(...matches.map(([_, sortedType]) => sortedType));
        }
        return res;
    }
}
exports.OverloadTree = OverloadTree;
//# sourceMappingURL=OverloadTree.js.map