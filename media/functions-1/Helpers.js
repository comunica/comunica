"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressionToVar = exports.dateTime = exports.langString = exports.string = exports.double = exports.float = exports.decimal = exports.integer = exports.bool = exports.Builder = exports.declare = void 0;
const rdf_data_factory_1 = require("rdf-data-factory");
const E = require("../expressions");
const expressions_1 = require("../expressions");
const C = require("../util/Consts");
const Consts_1 = require("../util/Consts");
const Err = require("../util/Errors");
const OverloadTree_1 = require("./OverloadTree");
const DF = new rdf_data_factory_1.DataFactory();
function declare(identifier) {
    return new Builder(identifier);
}
exports.declare = declare;
class Builder {
    constructor(identifier) {
        this.overloadTree = new OverloadTree_1.OverloadTree(identifier);
        this.collected = false;
    }
    collect() {
        if (this.collected) {
            // Only 1 time allowed because we can't copy a tree. (And we don't need this).
            throw new Error('Builders can only be collected once!');
        }
        this.collected = true;
        return this.overloadTree;
    }
    static wrapInvalidLexicalProtected(func) {
        return (context) => (args) => {
            for (const [index, arg] of args.entries()) {
                if (arg instanceof expressions_1.NonLexicalLiteral) {
                    throw new Err.InvalidLexicalForm(args[index].toRDF());
                }
            }
            return func(context)(args);
        };
    }
    set(argTypes, func, addInvalidHandling = true) {
        this.overloadTree.addOverload(argTypes, addInvalidHandling ? Builder.wrapInvalidLexicalProtected(func) : func);
        return this;
    }
    copy({ from, to }) {
        const impl = this.overloadTree.getImplementationExact(from);
        if (!impl) {
            throw new Err.UnexpectedError('Tried to copy implementation, but types not found', { from, to });
        }
        return this.set(to, impl);
    }
    onUnary(type, op, addInvalidHandling = true) {
        return this.set([type], context => ([val]) => op(context)(val), addInvalidHandling);
    }
    onUnaryTyped(type, op, addInvalidHandling = true) {
        return this.set([type], context => ([val]) => op(context)(val.typedValue), addInvalidHandling);
    }
    onBinary(types, op, addInvalidHandling = true) {
        return this.set(types, context => ([left, right]) => op(context)(left, right), addInvalidHandling);
    }
    onBinaryTyped(types, op, addInvalidHandling = true) {
        return this.set(types, context => ([left, right]) => op(context)(left.typedValue, right.typedValue), addInvalidHandling);
    }
    onTernaryTyped(types, op, addInvalidHandling = true) {
        return this.set(types, context => ([a1, a2, a3]) => op(context)(a1.typedValue, a2.typedValue, a3.typedValue), addInvalidHandling);
    }
    onTernary(types, op, addInvalidHandling = true) {
        return this.set(types, context => ([a1, a2, a3]) => op(context)(a1, a2, a3), addInvalidHandling);
    }
    onQuaternaryTyped(types, op, addInvalidHandling = true) {
        return this.set(types, context => ([a1, a2, a3, a4]) => op(context)(a1.typedValue, a2.typedValue, a3.typedValue, a4.typedValue), addInvalidHandling);
    }
    onTerm1(op, addInvalidHandling = false) {
        return this.set(['term'], context => ([term]) => op(context)(term), addInvalidHandling);
    }
    onTerm3(op) {
        return this.set(['term', 'term', 'term'], context => ([t1, t2, t3]) => op(context)(t1, t2, t3));
    }
    onQuad1(op) {
        return this.set(['quad'], context => ([term]) => op(context)(term));
    }
    onLiteral1(op, addInvalidHandling = true) {
        return this.set(['literal'], context => ([term]) => op(context)(term), addInvalidHandling);
    }
    onBoolean1(op, addInvalidHandling = true) {
        return this.set([C.TypeURL.XSD_BOOLEAN], context => ([lit]) => op(context)(lit), addInvalidHandling);
    }
    onBoolean1Typed(op, addInvalidHandling = true) {
        return this.set([C.TypeURL.XSD_BOOLEAN], context => ([lit]) => op(context)(lit.typedValue), addInvalidHandling);
    }
    onString1(op, addInvalidHandling = true) {
        return this.set([C.TypeURL.XSD_STRING], context => ([lit]) => op(context)(lit), addInvalidHandling);
    }
    onString1Typed(op, addInvalidHandling = true) {
        return this.set([C.TypeURL.XSD_STRING], context => ([lit]) => op(context)(lit.typedValue), addInvalidHandling);
    }
    onLangString1(op, addInvalidHandling = true) {
        return this.set([C.TypeURL.RDF_LANG_STRING], context => ([lit]) => op(context)(lit), addInvalidHandling);
    }
    onStringly1(op, addInvalidHandling = true) {
        return this.set([C.TypeAlias.SPARQL_STRINGLY], context => ([lit]) => op(context)(lit), addInvalidHandling);
    }
    onStringly1Typed(op, addInvalidHandling = true) {
        return this.set([C.TypeAlias.SPARQL_STRINGLY], context => ([lit]) => op(context)(lit.typedValue), addInvalidHandling);
    }
    onNumeric1(op, addInvalidHandling = true) {
        return this.set([C.TypeAlias.SPARQL_NUMERIC], context => ([val]) => op(context)(val), addInvalidHandling);
    }
    onDateTime1(op, addInvalidHandling = true) {
        return this
            .set([C.TypeURL.XSD_DATE_TIME], context => ([val]) => op(context)(val), addInvalidHandling);
    }
    /**
     * We return the base types and not the provided types because we don't want to create invalid terms.
     * Providing negative number to a function unary - for example should not
     * return a term of type negative number having a positive value.
     * @param op the numeric operator performed
     * @param addInvalidHandling whether to add invalid handling,
     *   whether to add @param op in @see wrapInvalidLexicalProtected
     */
    numericConverter(op, addInvalidHandling = true) {
        const evalHelper = (context) => (arg) => op(context)(arg.typedValue);
        return this.onUnary(Consts_1.TypeURL.XSD_INTEGER, context => arg => integer(evalHelper(context)(arg)), addInvalidHandling)
            .onUnary(Consts_1.TypeURL.XSD_DECIMAL, context => arg => decimal(evalHelper(context)(arg)), addInvalidHandling)
            .onUnary(Consts_1.TypeURL.XSD_FLOAT, context => arg => float(evalHelper(context)(arg)), addInvalidHandling)
            .onUnary(Consts_1.TypeURL.XSD_DOUBLE, context => arg => double(evalHelper(context)(arg)), addInvalidHandling);
    }
    /**
     * !!! Be aware when using this function, it will create different overloads with different return types !!!
     * Arithmetic operators take 2 numeric arguments, and return a single numerical
     * value. The type of the return value is heavily dependent on the types of the
     * input arguments. In JS everything is a double, but in SPARQL it is not.
     *
     * The different arguments are handled by type promotion and subtype substitution.
     * The way numeric function arguments work is described here:
     * https://www.w3.org/TR/xpath20/#mapping
     * Above url is referenced in the sparql spec: https://www.w3.org/TR/sparql11-query/#OperatorMapping
     */
    arithmetic(op, addInvalidHandling = true) {
        const evalHelper = (context) => (left, right) => op(context)(left.typedValue, right.typedValue);
        return this.onBinary([Consts_1.TypeURL.XSD_INTEGER, Consts_1.TypeURL.XSD_INTEGER], context => (left, right) => integer(evalHelper(context)(left, right)), addInvalidHandling)
            .onBinary([Consts_1.TypeURL.XSD_DECIMAL, Consts_1.TypeURL.XSD_DECIMAL], context => (left, right) => decimal(evalHelper(context)(left, right)), addInvalidHandling)
            .onBinary([Consts_1.TypeURL.XSD_FLOAT, Consts_1.TypeURL.XSD_FLOAT], context => (left, right) => float(evalHelper(context)(left, right)), addInvalidHandling)
            .onBinary([Consts_1.TypeURL.XSD_DOUBLE, Consts_1.TypeURL.XSD_DOUBLE], context => (left, right) => double(evalHelper(context)(left, right)), addInvalidHandling);
    }
    numberTest(test) {
        return this.numeric(context => ([left, right]) => {
            const result = test(context)(left.typedValue, right.typedValue);
            return bool(result);
        });
    }
    stringTest(test, addInvalidHandling = true) {
        return this
            .set([C.TypeURL.XSD_STRING, C.TypeURL.XSD_STRING], context => ([left, right]) => {
            const result = test(context)(left.typedValue, right.typedValue);
            return bool(result);
        }, addInvalidHandling);
    }
    booleanTest(test, addInvalidHandling = true) {
        return this
            .set([C.TypeURL.XSD_BOOLEAN, C.TypeURL.XSD_BOOLEAN], context => ([left, right]) => {
            const result = test(context)(left.typedValue, right.typedValue);
            return bool(result);
        }, addInvalidHandling);
    }
    dateTimeTest(test, addInvalidHandling = true) {
        return this
            .set([C.TypeURL.XSD_DATE_TIME, C.TypeURL.XSD_DATE_TIME], context => ([left, right]) => {
            const result = test(context)(left.typedValue, right.typedValue);
            return bool(result);
        }, addInvalidHandling);
    }
    numeric(op) {
        return this.set([C.TypeAlias.SPARQL_NUMERIC, C.TypeAlias.SPARQL_NUMERIC], op);
    }
}
exports.Builder = Builder;
// ----------------------------------------------------------------------------
// Literal Construction helpers
// ----------------------------------------------------------------------------
function bool(val) {
    return new E.BooleanLiteral(val);
}
exports.bool = bool;
function integer(num) {
    return new E.IntegerLiteral(num);
}
exports.integer = integer;
function decimal(num) {
    return new E.DecimalLiteral(num);
}
exports.decimal = decimal;
function float(num) {
    return new E.FloatLiteral(num);
}
exports.float = float;
function double(num) {
    return new E.DoubleLiteral(num);
}
exports.double = double;
function string(str) {
    return new E.StringLiteral(str);
}
exports.string = string;
function langString(str, lang) {
    return new E.LangStringLiteral(str, lang);
}
exports.langString = langString;
function dateTime(date, str) {
    return new E.DateTimeLiteral(date, str);
}
exports.dateTime = dateTime;
function expressionToVar(variableExpression) {
    return DF.variable(variableExpression.name.slice(1));
}
exports.expressionToVar = expressionToVar;
//# sourceMappingURL=Helpers.js.map