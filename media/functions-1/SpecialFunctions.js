"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specialDefinitions = void 0;
const uuid = require("uuid");
const E = require("../expressions");
const C = require("../util/Consts");
const Err = require("../util/Errors");
const Helpers_1 = require("./Helpers");
const _1 = require(".");
// ----------------------------------------------------------------------------
// Functional forms
// ----------------------------------------------------------------------------
// BOUND ----------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-bound
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const bound = {
    arity: 1,
    async applyAsync({ args, mapping }) {
        return bound_({ args, mapping });
    },
    applySynchronously({ args, mapping }) {
        return bound_({ args, mapping });
    },
};
function bound_({ args, mapping }) {
    const variable = args[0];
    if (variable.expressionType !== E.ExpressionType.Variable) {
        throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
    }
    const val = mapping.has((0, Helpers_1.expressionToVar)(variable));
    return (0, Helpers_1.bool)(val);
}
// IF -------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-if
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const ifSPARQL = {
    arity: 3,
    async applyAsync({ args, mapping, evaluate }) {
        const valFirst = await evaluate(args[0], mapping);
        const ebv = valFirst.coerceEBV();
        return ebv ?
            evaluate(args[1], mapping) :
            evaluate(args[2], mapping);
    },
    applySynchronously({ args, mapping, evaluate }) {
        const valFirst = evaluate(args[0], mapping);
        const ebv = valFirst.coerceEBV();
        return ebv ?
            evaluate(args[1], mapping) :
            evaluate(args[2], mapping);
    },
};
// COALESCE -------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-coalesce
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const coalesce = {
    arity: Number.POSITIVE_INFINITY,
    async applyAsync({ args, mapping, evaluate }) {
        const errors = [];
        for (const expr of args) {
            try {
                return await evaluate(expr, mapping);
            }
            catch (error) {
                errors.push(error);
            }
        }
        throw new Err.CoalesceError(errors);
    },
    applySynchronously({ args, mapping, evaluate }) {
        const errors = [];
        for (const expr of args) {
            try {
                return evaluate(expr, mapping);
            }
            catch (error) {
                errors.push(error);
            }
        }
        throw new Err.CoalesceError(errors);
    },
};
// Logical-or (||) ------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-or
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const logicalOr = {
    arity: 2,
    async applyAsync({ args, mapping, evaluate }) {
        const [leftExpr, rightExpr] = args;
        try {
            const leftTerm = await evaluate(leftExpr, mapping);
            const left = leftTerm.coerceEBV();
            if (left) {
                return (0, Helpers_1.bool)(true);
            }
            const rightTerm = await evaluate(rightExpr, mapping);
            const right = rightTerm.coerceEBV();
            return (0, Helpers_1.bool)(right);
        }
        catch (error) {
            const rightErrorTerm = await evaluate(rightExpr, mapping);
            const rightError = rightErrorTerm.coerceEBV();
            if (!rightError) {
                throw error;
            }
            return (0, Helpers_1.bool)(true);
        }
    },
    applySynchronously({ args, mapping, evaluate }) {
        const [leftExpr, rightExpr] = args;
        try {
            const leftTerm = evaluate(leftExpr, mapping);
            const left = leftTerm.coerceEBV();
            if (left) {
                return (0, Helpers_1.bool)(true);
            }
            const rightTerm = evaluate(rightExpr, mapping);
            const right = rightTerm.coerceEBV();
            return (0, Helpers_1.bool)(right);
        }
        catch (error) {
            const rightErrorTerm = evaluate(rightExpr, mapping);
            const rightError = rightErrorTerm.coerceEBV();
            if (!rightError) {
                throw error;
            }
            return (0, Helpers_1.bool)(true);
        }
    },
};
// Logical-and (&&) -----------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-logical-and
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const logicalAnd = {
    arity: 2,
    async applyAsync({ args, mapping, evaluate }) {
        const [leftExpr, rightExpr] = args;
        try {
            const leftTerm = await evaluate(leftExpr, mapping);
            const left = leftTerm.coerceEBV();
            if (!left) {
                return (0, Helpers_1.bool)(false);
            }
            const rightTerm = await evaluate(rightExpr, mapping);
            const right = rightTerm.coerceEBV();
            return (0, Helpers_1.bool)(right);
        }
        catch (error) {
            const rightErrorTerm = await evaluate(rightExpr, mapping);
            const rightError = rightErrorTerm.coerceEBV();
            if (rightError) {
                throw error;
            }
            return (0, Helpers_1.bool)(false);
        }
    },
    applySynchronously({ args, mapping, evaluate }) {
        const [leftExpr, rightExpr] = args;
        try {
            const leftTerm = evaluate(leftExpr, mapping);
            const left = leftTerm.coerceEBV();
            if (!left) {
                return (0, Helpers_1.bool)(false);
            }
            const rightTerm = evaluate(rightExpr, mapping);
            const right = rightTerm.coerceEBV();
            return (0, Helpers_1.bool)(right);
        }
        catch (error) {
            const rightErrorTerm = evaluate(rightExpr, mapping);
            const rightError = rightErrorTerm.coerceEBV();
            if (rightError) {
                throw error;
            }
            return (0, Helpers_1.bool)(false);
        }
    },
};
// SameTerm -------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-sameTerm
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const sameTerm = {
    arity: 2,
    async applyAsync({ args, mapping, evaluate }) {
        const [leftExpr, rightExpr] = args.map(arg => evaluate(arg, mapping));
        const [left, right] = await Promise.all([leftExpr, rightExpr]);
        return (0, Helpers_1.bool)(left.toRDF().equals(right.toRDF()));
    },
    applySynchronously({ args, mapping, evaluate }) {
        const [left, right] = args.map(arg => evaluate(arg, mapping));
        return (0, Helpers_1.bool)(left.toRDF().equals(right.toRDF()));
    },
};
// IN -------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const inSPARQL = {
    arity: Number.POSITIVE_INFINITY,
    checkArity(args) {
        return args.length > 0;
    },
    async applyAsync(context) {
        const { args, mapping, evaluate } = context;
        const [leftExpr, ...remaining] = args;
        const left = await evaluate(leftExpr, mapping);
        return inRecursiveAsync(left, { ...context, args: remaining }, []);
    },
    applySynchronously(context) {
        const { args, mapping, evaluate } = context;
        const [leftExpr, ...remaining] = args;
        const left = evaluate(leftExpr, mapping);
        return inRecursiveSync(left, { ...context, args: remaining }, []);
    },
};
async function inRecursiveAsync(needle, context, results) {
    const { args, mapping, evaluate } = context;
    if (args.length === 0) {
        const noErrors = results.every(val => !val);
        return noErrors ? (0, Helpers_1.bool)(false) : Promise.reject(new Err.InError(results));
    }
    try {
        const nextExpression = args.shift();
        // We know this will not be undefined because we check args.length === 0
        const next = await evaluate(nextExpression, mapping);
        const isEqual = _1.regularFunctions[C.RegularOperator.EQUAL];
        if (isEqual.apply([needle, next], context).typedValue) {
            return (0, Helpers_1.bool)(true);
        }
        return inRecursiveAsync(needle, context, [...results, false]);
    }
    catch (error) {
        return inRecursiveAsync(needle, context, [...results, error]);
    }
}
function inRecursiveSync(needle, context, results) {
    const { args, mapping, evaluate } = context;
    if (args.length === 0) {
        const noErrors = results.every(val => !val);
        if (noErrors) {
            return (0, Helpers_1.bool)(false);
        }
        throw new Err.InError(results);
    }
    try {
        const nextExpression = args.shift();
        // We know this will not be undefined because we check args.length === 0
        const next = evaluate(nextExpression, mapping);
        const isEqual = _1.regularFunctions[C.RegularOperator.EQUAL];
        if (isEqual.apply([needle, next], context).typedValue) {
            return (0, Helpers_1.bool)(true);
        }
        return inRecursiveSync(needle, context, [...results, false]);
    }
    catch (error) {
        return inRecursiveSync(needle, context, [...results, error]);
    }
}
// NOT IN ---------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-not-in
 * This function doesn't require type promotion or subtype-substitution, everything works on TermExpression
 */
const notInSPARQL = {
    arity: Number.POSITIVE_INFINITY,
    checkArity(args) {
        return args.length > 0;
    },
    async applyAsync(context) {
        const _in = _1.specialFunctions[C.SpecialOperator.IN];
        const isIn = await _in.applyAsync(context);
        return (0, Helpers_1.bool)(!isIn.typedValue);
    },
    applySynchronously(context) {
        const _in = _1.specialFunctions[C.SpecialOperator.IN];
        const isIn = _in.applySynchronously(context);
        return (0, Helpers_1.bool)(!isIn.typedValue);
    },
};
// ----------------------------------------------------------------------------
// Annoying functions
// ----------------------------------------------------------------------------
// CONCAT ---------------------------------------------------------------------
/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const concatTree = (0, Helpers_1.declare)(C.SpecialOperator.CONCAT).onStringly1(() => expr => expr)
    .collect();
/**
 * https://www.w3.org/TR/sparql11-query/#func-concat
 */
const concat = {
    arity: Number.POSITIVE_INFINITY,
    async applyAsync(context) {
        const { args, mapping, evaluate, functionArgumentsCache, superTypeProvider } = context;
        const pLits = args
            .map(async (expr) => evaluate(expr, mapping))
            .map(async (pTerm) => {
            const operation = concatTree.search([await pTerm], superTypeProvider, functionArgumentsCache);
            if (!operation) {
                throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.CONCAT);
            }
            return operation(context)([await pTerm]);
        });
        const lits = await Promise.all(pLits);
        const strings = lits.map(lit => lit.typedValue);
        const joined = strings.join('');
        const lang = langAllEqual(lits) ? lits[0].language : undefined;
        return lang ? (0, Helpers_1.langString)(joined, lang) : (0, Helpers_1.string)(joined);
    },
    applySynchronously(context) {
        const { args, mapping, evaluate, superTypeProvider, functionArgumentsCache } = context;
        const lits = args
            .map(expr => evaluate(expr, mapping))
            .map((pTerm) => {
            const operation = concatTree.search([pTerm], superTypeProvider, functionArgumentsCache);
            if (!operation) {
                throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.CONCAT);
            }
            return operation(context)([pTerm]);
        });
        const strings = lits.map(lit => lit.typedValue);
        const joined = strings.join('');
        const lang = langAllEqual(lits) ? lits[0].language : undefined;
        return lang ? (0, Helpers_1.langString)(joined, lang) : (0, Helpers_1.string)(joined);
    },
};
function langAllEqual(lits) {
    return lits.length > 0 && lits.every(lit => lit.language === lits[0].language);
}
// ----------------------------------------------------------------------------
// Context dependant functions
// ----------------------------------------------------------------------------
// BNODE ---------------------------------------------------------------------
/**
 * This OverloadTree with the constant function will handle both type promotion and subtype-substitution
 */
const bnodeTree = (0, Helpers_1.declare)(C.SpecialOperator.BNODE).onString1(() => arg => arg).collect();
/**
 * https://www.w3.org/TR/sparql11-query/#func-bnode
 * id has to be distinct over all id's in dataset
 */
const BNODE = {
    arity: Number.POSITIVE_INFINITY,
    checkArity(args) {
        return args.length === 0 || args.length === 1;
    },
    async applyAsync(context) {
        const { args, mapping, evaluate, superTypeProvider, functionArgumentsCache } = context;
        const input = args.length === 1 ?
            await evaluate(args[0], mapping) :
            undefined;
        let strInput;
        if (input) {
            const operation = bnodeTree.search([input], superTypeProvider, functionArgumentsCache);
            if (!operation) {
                throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
            }
            strInput = operation(context)([input]).str();
        }
        if (context.bnode) {
            const bnode = await context.bnode(strInput);
            return new E.BlankNode(bnode);
        }
        return BNODE_(strInput);
    },
    applySynchronously(context) {
        const { args, mapping, evaluate, superTypeProvider, functionArgumentsCache } = context;
        const input = args.length === 1 ?
            evaluate(args[0], mapping) :
            undefined;
        let strInput;
        if (input) {
            const operation = bnodeTree.search([input], superTypeProvider, functionArgumentsCache);
            if (!operation) {
                throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BNODE);
            }
            strInput = operation(context)([input]).str();
        }
        if (context.bnode) {
            const bnode = context.bnode(strInput);
            return new E.BlankNode(bnode);
        }
        return BNODE_(strInput);
    },
};
function BNODE_(input) {
    return new E.BlankNode(input ?? uuid.v4());
}
exports.specialDefinitions = {
    // --------------------------------------------------------------------------
    // Functional Forms
    // https://www.w3.org/TR/sparql11-query/#func-forms
    // --------------------------------------------------------------------------
    bound,
    if: ifSPARQL,
    coalesce,
    '&&': logicalAnd,
    '||': logicalOr,
    sameterm: sameTerm,
    in: inSPARQL,
    notin: notInSPARQL,
    // Annoying functions
    concat,
    // Context dependent functions
    bnode: BNODE,
};
//# sourceMappingURL=SpecialFunctions.js.map