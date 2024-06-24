"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialFunction = exports.NamedFunction = exports.RegularFunction = exports.BaseFunction = void 0;
const Err = require("../util/Errors");
class BaseFunction {
    constructor(operator, definition) {
        this.operator = operator;
        /**
         * A function application works by monomorphing the function to a specific
         * instance depending on the runtime types. We then just apply this function
         * to the args.
         */
        this.apply = (args, context) => {
            const concreteFunction = this.monomorph(args, context.superTypeProvider, context.functionArgumentsCache) ??
                this.handleInvalidTypes(args);
            return concreteFunction(context)(args);
        };
        this.arity = definition.arity;
        this.overloads = definition.overloads;
    }
    /**
     * We monomorph by checking the map of overloads for keys corresponding
     * to the runtime types. We start by checking for an implementation for the
     * most concrete types (integer, string, date, IRI), if we find none,
     * we consider their term types (literal, blank, IRI), and lastly we consider
     * all arguments as generic terms.
     *
     * Another option would be to populate the overloads with an implementation
     * for every concrete type when the function is generic over termtypes or
     * terms.
     */
    monomorph(args, superTypeProvider, functionArgumentsCache) {
        return this.overloads.search(args, superTypeProvider, functionArgumentsCache);
    }
}
exports.BaseFunction = BaseFunction;
// Regular Functions ----------------------------------------------------------
/**
 * Varying kinds of functions take arguments of different types on which the
 * specific behaviour is dependant. Although their behaviour is often varying,
 * it is always relatively simple, and better suited for synced behaviour.
 * The types of their arguments are always terms, but might differ in
 * their term-type (eg: iri, literal),
 * their specific literal type (eg: string, integer),
 * their arity (see BNODE),
 * or even their specific numeric type (eg: integer, float).
 *
 * Examples include:
 *  - Arithmetic operations such as: *, -, /, +
 *  - Bool operators such as: =, !=, <=, <, ...
 *  - Functions such as: str, IRI
 *
 * See also: https://www.w3.org/TR/sparql11-query/#func-rdfTerms
 * and https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
class RegularFunction extends BaseFunction {
    constructor(op, definition) {
        super(op, definition);
        this.functionClass = 'regular';
    }
    handleInvalidTypes(args) {
        throw new Err.InvalidArgumentTypes(args, this.operator);
    }
}
exports.RegularFunction = RegularFunction;
// Named Functions ------------------------------------------------------------
class NamedFunction extends BaseFunction {
    constructor(op, definition) {
        super(op, definition);
        this.functionClass = 'named';
    }
    handleInvalidTypes(args) {
        throw new Err.InvalidArgumentTypes(args, this.operator);
    }
}
exports.NamedFunction = NamedFunction;
// Special Functions ----------------------------------------------------------
/**
 * Special Functions are those that don't really fit in sensible categories and
 * have extremely heterogeneous signatures that make them impossible to abstract
 * over. They are small in number, and their behaviour is often complex and open
 * for multiple correct implementations with different trade-offs.
 *
 * Due to their varying nature, they need all available information present
 * during evaluation. This reflects in the signature of the apply() method.
 *
 * They need access to an evaluator to be able to even implement their logic.
 * Especially relevant for IF, and the logical connectives.
 *
 * They can have both sync and async implementations, and both would make sense
 * in some contexts.
 */
class SpecialFunction {
    constructor(operator, definition) {
        this.operator = operator;
        this.functionClass = 'special';
        this.arity = definition.arity;
        this.applySynchronously = definition.applySynchronously;
        this.applyAsync = definition.applyAsync;
        this.checkArity = definition.checkArity ?? defaultArityCheck(this.arity);
    }
}
exports.SpecialFunction = SpecialFunction;
function defaultArityCheck(arity) {
    return (args) => {
        // Infinity is used to represent var-args, so it's always correct.
        if (arity === Number.POSITIVE_INFINITY) {
            return true;
        }
        return args.length === arity;
    };
}
//# sourceMappingURL=Core.js.map