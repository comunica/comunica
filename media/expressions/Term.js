"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonLexicalLiteral = exports.NonLexicalLiteral = exports.YearMonthDurationLiteral = exports.DayTimeDurationLiteral = exports.DurationLiteral = exports.DateLiteral = exports.TimeLiteral = exports.DateTimeLiteral = exports.StringLiteral = exports.LangStringLiteral = exports.BooleanLiteral = exports.DoubleLiteral = exports.FloatLiteral = exports.DecimalLiteral = exports.IntegerLiteral = exports.NumericLiteral = exports.Literal = exports.isLiteralTermExpression = exports.Quad = exports.BlankNode = exports.NamedNode = exports.Term = void 0;
const rdf_data_factory_1 = require("rdf-data-factory");
const TermTransformer_1 = require("../transformers/TermTransformer");
const C = require("../util/Consts");
const Consts_1 = require("../util/Consts");
const Err = require("../util/Errors");
const Serialization_1 = require("../util/Serialization");
const TypeHandling_1 = require("../util/TypeHandling");
const Expressions_1 = require("./Expressions");
const DF = new rdf_data_factory_1.DataFactory();
class Term {
    constructor() {
        this.expressionType = Expressions_1.ExpressionType.Term;
    }
    str() {
        throw new Err.InvalidArgumentTypes([this], C.RegularOperator.STR);
    }
    coerceEBV() {
        throw new Err.EBVCoercionError(this);
    }
}
exports.Term = Term;
// NamedNodes -----------------------------------------------------------------
class NamedNode extends Term {
    constructor(value) {
        super();
        this.value = value;
        this.termType = 'namedNode';
    }
    toRDF() {
        return DF.namedNode(this.value);
    }
    str() {
        return this.value;
    }
}
exports.NamedNode = NamedNode;
// BlankNodes -----------------------------------------------------------------
class BlankNode extends Term {
    constructor(value) {
        super();
        this.termType = 'blankNode';
        this.value = typeof value === 'string' ? DF.blankNode(value) : value;
    }
    toRDF() {
        return this.value;
    }
}
exports.BlankNode = BlankNode;
// Quads -----------------------------------------------------------------
class Quad extends Term {
    constructor(input, superTypeProvider) {
        super();
        this.termType = 'quad';
        this.transformer = new TermTransformer_1.TermTransformer(superTypeProvider);
        this.valueTerm = input;
    }
    toRDF() {
        return this.valueTerm;
    }
    get subject() {
        return this.transformer.transformRDFTermUnsafe(this.RDFsubject);
    }
    get predicate() {
        return this.transformer.transformRDFTermUnsafe(this.RDFpredicate);
    }
    get object() {
        return this.transformer.transformRDFTermUnsafe(this.RDFobject);
    }
    get RDFsubject() {
        return this.toRDF().subject;
    }
    get RDFpredicate() {
        return this.toRDF().predicate;
    }
    get RDFobject() {
        return this.toRDF().object;
    }
}
exports.Quad = Quad;
// Literals-- -----------------------------------------------------------------
function isLiteralTermExpression(expr) {
    if (expr.termType === 'literal') {
        return expr;
    }
    return undefined;
}
exports.isLiteralTermExpression = isLiteralTermExpression;
class Literal extends Term {
    /**
     * @param typedValue internal representation of this literal's value
     * @param dataType a string representing the datatype. Can be of type @see LiteralTypes or any URI
     * @param strValue the string value of this literal. In other words, the string representing the RDF.literal value.
     * @param language the language, mainly for language enabled strings like RDF_LANG_STRING
     */
    constructor(typedValue, dataType, strValue, language) {
        super();
        this.typedValue = typedValue;
        this.dataType = dataType;
        this.strValue = strValue;
        this.language = language;
        this.termType = 'literal';
    }
    toRDF() {
        return DF.literal(this.strValue ?? this.str(), this.language ?? DF.namedNode(this.dataType));
    }
    str() {
        return this.strValue ?? this.typedValue.toString();
    }
}
exports.Literal = Literal;
class NumericLiteral extends Literal {
    constructor(typedValue, dataType, strValue, language) {
        super(typedValue, dataType, strValue, language);
        this.typedValue = typedValue;
        this.strValue = strValue;
        this.language = language;
    }
    coerceEBV() {
        return Boolean(this.typedValue);
    }
    toRDF() {
        const term = super.toRDF();
        if (!Number.isFinite(this.typedValue)) {
            term.value = term.value.replace('Infinity', 'INF');
        }
        return term;
    }
    str() {
        return this.strValue ??
            this.specificFormatter(this.typedValue);
    }
}
exports.NumericLiteral = NumericLiteral;
class IntegerLiteral extends NumericLiteral {
    constructor(typedValue, dataType, strValue, language) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_INTEGER, strValue, language);
        this.typedValue = typedValue;
        this.strValue = strValue;
        this.language = language;
    }
    specificFormatter(val) {
        return val.toFixed(0);
    }
}
exports.IntegerLiteral = IntegerLiteral;
class DecimalLiteral extends NumericLiteral {
    constructor(typedValue, dataType, strValue, language) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_DECIMAL, strValue, language);
        this.typedValue = typedValue;
        this.strValue = strValue;
        this.language = language;
    }
    specificFormatter(val) {
        return val.toString();
    }
}
exports.DecimalLiteral = DecimalLiteral;
class FloatLiteral extends NumericLiteral {
    constructor(typedValue, dataType, strValue, language) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_FLOAT, strValue, language);
        this.typedValue = typedValue;
        this.strValue = strValue;
        this.language = language;
    }
    specificFormatter(val) {
        return val.toString();
    }
}
exports.FloatLiteral = FloatLiteral;
class DoubleLiteral extends NumericLiteral {
    constructor(typedValue, dataType, strValue, language) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_DOUBLE, strValue, language);
        this.typedValue = typedValue;
        this.strValue = strValue;
        this.language = language;
    }
    specificFormatter(val) {
        if (!Number.isFinite(val)) {
            if (val > 0) {
                return 'INF';
            }
            if (val < 0) {
                return '-INF';
            }
            return 'NaN';
        }
        const jsExponential = val.toExponential();
        const [jsMantisse, jsExponent] = jsExponential.split('e');
        // Leading + must be removed for integer
        // https://www.w3.org/TR/xmlschema-2/#integer
        const exponent = jsExponent.replace(/\+/u, '');
        // SPARQL test suite prefers trailing zero's
        const mantisse = jsMantisse.includes('.') ?
            jsMantisse :
            `${jsMantisse}.0`;
        return `${mantisse}E${exponent}`;
    }
}
exports.DoubleLiteral = DoubleLiteral;
class BooleanLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_BOOLEAN, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    coerceEBV() {
        return this.typedValue;
    }
}
exports.BooleanLiteral = BooleanLiteral;
class LangStringLiteral extends Literal {
    constructor(typedValue, language, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.RDF_LANG_STRING, typedValue, language);
        this.typedValue = typedValue;
        this.language = language;
    }
    coerceEBV() {
        return this.str().length > 0;
    }
}
exports.LangStringLiteral = LangStringLiteral;
// https://www.w3.org/TR/2004/REC-rdf-concepts-20040210/#dfn-plain-literal
// https://www.w3.org/TR/sparql11-query/#defn_SimpleLiteral
// https://www.w3.org/TR/sparql11-query/#func-strings
// This does not include language tagged literals
class StringLiteral extends Literal {
    /**
     * @param typedValue
     * @param dataType Should be type that implements XSD_STRING
     */
    constructor(typedValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_STRING, typedValue);
        this.typedValue = typedValue;
    }
    coerceEBV() {
        return this.str().length > 0;
    }
}
exports.StringLiteral = StringLiteral;
class DateTimeLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_DATE_TIME, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    str() {
        return (0, Serialization_1.serializeDateTime)(this.typedValue);
    }
}
exports.DateTimeLiteral = DateTimeLiteral;
class TimeLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_TIME, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    str() {
        return (0, Serialization_1.serializeTime)(this.typedValue);
    }
}
exports.TimeLiteral = TimeLiteral;
class DateLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_DATE, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    str() {
        return (0, Serialization_1.serializeDate)(this.typedValue);
    }
}
exports.DateLiteral = DateLiteral;
class DurationLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_DURATION, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    str() {
        return (0, Serialization_1.serializeDuration)(this.typedValue);
    }
}
exports.DurationLiteral = DurationLiteral;
class DayTimeDurationLiteral extends DurationLiteral {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, strValue, dataType ?? Consts_1.TypeURL.XSD_DAY_TIME_DURATION);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
}
exports.DayTimeDurationLiteral = DayTimeDurationLiteral;
class YearMonthDurationLiteral extends Literal {
    constructor(typedValue, strValue, dataType) {
        super(typedValue, dataType ?? Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION, strValue);
        this.typedValue = typedValue;
        this.strValue = strValue;
    }
    str() {
        return (0, Serialization_1.serializeDuration)(this.typedValue, 'P0M');
    }
}
exports.YearMonthDurationLiteral = YearMonthDurationLiteral;
/**
 * This class is used when a literal is parsed, and it's value is
 * an invalid lexical form for it's datatype. The spec defines value with
 * invalid lexical form are still valid terms, and as such we can not error
 * immediately. This class makes sure that the typedValue will remain undefined,
 * and the category 'nonlexical'. This way, only when operators apply to the
 * 'nonlexical' category, they will keep working, otherwise they will throw a
 * type error.
 * This seems to match the spec, except maybe for functions that accept
 * non-lexical values for their datatype.
 *
 * See:
 *  - https://www.w3.org/TR/xquery/#dt-type-error
 *  - https://www.w3.org/TR/rdf-concepts/#section-Literal-Value
 *  - https://www.w3.org/TR/xquery/#dt-ebv
 *  - ... some other more precise thing i can't find...
 */
class NonLexicalLiteral extends Literal {
    constructor(typedValue, dataType, openWorldType, strValue, language) {
        super({ toString: () => 'undefined' }, dataType, strValue, language);
        this.openWorldType = openWorldType;
    }
    coerceEBV() {
        const isNumericOrBool = (0, TypeHandling_1.isSubTypeOf)(this.dataType, Consts_1.TypeURL.XSD_BOOLEAN, this.openWorldType) ||
            (0, TypeHandling_1.isSubTypeOf)(this.dataType, Consts_1.TypeAlias.SPARQL_NUMERIC, this.openWorldType);
        if (isNumericOrBool) {
            return false;
        }
        throw new Err.EBVCoercionError(this);
    }
    toRDF() {
        return DF.literal(this.str(), this.language ?? DF.namedNode(this.dataType));
    }
    str() {
        return this.strValue ?? '';
    }
}
exports.NonLexicalLiteral = NonLexicalLiteral;
function isNonLexicalLiteral(lit) {
    if (lit instanceof NonLexicalLiteral) {
        return lit;
    }
    return undefined;
}
exports.isNonLexicalLiteral = isNonLexicalLiteral;
//# sourceMappingURL=Term.js.map