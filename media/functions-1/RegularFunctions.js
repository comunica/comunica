"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definitions = void 0;
const bignumber_js_1 = require("bignumber.js");
const hash_js_1 = require("hash.js");
const rdf_data_factory_1 = require("rdf-data-factory");
const relative_to_absolute_iri_1 = require("relative-to-absolute-iri");
const spark_md5_1 = require("spark-md5");
const uuid = require("uuid");
const E = require("../expressions");
const TermTransformer_1 = require("../transformers/TermTransformer");
const C = require("../util/Consts");
const Consts_1 = require("../util/Consts");
const DateTimeHelpers_1 = require("../util/DateTimeHelpers");
const Err = require("../util/Errors");
const Ordering_1 = require("../util/Ordering");
const SpecAlgos_1 = require("../util/SpecAlgos");
const Core_1 = require("./Core");
const Helpers_1 = require("./Helpers");
const X = require("./XPathFunctions");
const _1 = require(".");
const DF = new rdf_data_factory_1.DataFactory();
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions
// ----------------------------------------------------------------------------
// Operator Mapping
// https://www.w3.org/TR/sparql11-query/#OperatorMapping
// ----------------------------------------------------------------------------
const not = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.NOT)
        .onTerm1(() => val => (0, Helpers_1.bool)(!val.coerceEBV()))
        .collect(),
};
const unaryPlus = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.UPLUS)
        .numericConverter(() => val => val)
        .collect(),
};
const unaryMinus = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.UMINUS)
        .numericConverter(() => val => -val)
        .collect(),
};
const multiplication = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.MULTIPLICATION)
        .arithmetic(() => (left, right) => new bignumber_js_1.BigNumber(left).times(right).toNumber())
        .collect(),
};
const division = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.DIVISION)
        .arithmetic(() => (left, right) => new bignumber_js_1.BigNumber(left).div(right).toNumber())
        .onBinaryTyped([Consts_1.TypeURL.XSD_INTEGER, Consts_1.TypeURL.XSD_INTEGER], () => (left, right) => {
        if (right === 0) {
            throw new Err.ExpressionError('Integer division by 0');
        }
        return (0, Helpers_1.decimal)(new bignumber_js_1.BigNumber(left).div(right).toNumber());
    })
        .collect(),
};
const addition = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.ADDITION)
        .arithmetic(() => (left, right) => new bignumber_js_1.BigNumber(left).plus(right).toNumber())
        .set([Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([date, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-dateTime
    new E.DateTimeLiteral((0, SpecAlgos_1.addDurationToDateTime)(date.typedValue, (0, DateTimeHelpers_1.defaultedDurationRepresentation)(dur.typedValue))))
        .copy({
        from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION],
        to: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION],
    })
        .set([Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([date, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-date
    new E.DateLiteral((0, SpecAlgos_1.addDurationToDateTime)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(date.typedValue), (0, DateTimeHelpers_1.defaultedDurationRepresentation)(dur.typedValue))))
        .copy({
        from: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DAY_TIME_DURATION],
        to: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION],
    })
        .set([Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([time, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-add-dayTimeDuration-to-time
    new E.TimeLiteral((0, SpecAlgos_1.addDurationToDateTime)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time.typedValue), (0, DateTimeHelpers_1.defaultedDurationRepresentation)(dur.typedValue))))
        .copy({
        from: [Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION],
        to: [Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION],
    })
        .collect(),
};
const subtraction = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SUBTRACTION)
        .arithmetic(() => (left, right) => new bignumber_js_1.BigNumber(left).minus(right).toNumber())
        .set([Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DATE_TIME], ({ defaultTimeZone }) => ([date1, date2]) => 
    // https://www.w3.org/TR/xpath-functions/#func-subtract-dateTimes;
    new E.DayTimeDurationLiteral((0, SpecAlgos_1.elapsedDuration)(date1.typedValue, date2.typedValue, defaultTimeZone)))
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DATE] })
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_TIME] })
        .set([Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([date, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-dateTime
    new E.DateTimeLiteral((0, SpecAlgos_1.addDurationToDateTime)(date.typedValue, (0, DateTimeHelpers_1.defaultedDurationRepresentation)((0, DateTimeHelpers_1.negateDuration)(dur.typedValue)))))
        .copy({
        from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION],
        to: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION],
    })
        .set([Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([date, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
    new E.DateLiteral((0, SpecAlgos_1.addDurationToDateTime)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(date.typedValue), (0, DateTimeHelpers_1.defaultedDurationRepresentation)((0, DateTimeHelpers_1.negateDuration)(dur.typedValue)))))
        .copy({
        from: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DAY_TIME_DURATION],
        to: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION],
    })
        .set([Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([time, dur]) => 
    // https://www.w3.org/TR/xpath-functions/#func-subtract-dayTimeDuration-from-date
    new E.TimeLiteral((0, SpecAlgos_1.addDurationToDateTime)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time.typedValue), (0, DateTimeHelpers_1.defaultedDurationRepresentation)((0, DateTimeHelpers_1.negateDuration)(dur.typedValue)))))
        .collect(),
};
// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
const equality = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.EQUAL)
        .numberTest(() => (left, right) => left === right)
        .stringTest(() => (left, right) => left.localeCompare(right) === 0)
        .set([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => ([left, right]) => (0, Helpers_1.bool)(left.str() === right.str() &&
        left.language === right.language))
        // Fall through: a TypeURL.XSD_STRING is never equal to a TypeURL.RDF_LANG_STRING.
        .set([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeAlias.SPARQL_STRINGLY], () => () => (0, Helpers_1.bool)(false))
        .booleanTest(() => (left, right) => left === right)
        .dateTimeTest(({ defaultTimeZone }) => (left, right) => (0, DateTimeHelpers_1.toUTCDate)(left, defaultTimeZone).getTime() === (0, DateTimeHelpers_1.toUTCDate)(right, defaultTimeZone).getTime())
        .copy({
        // https://www.w3.org/TR/xpath-functions/#func-date-equal
        from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DATE_TIME],
        to: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DATE],
    })
        .set(['quad', 'quad'], context => ([left, right]) => {
        const op = new Core_1.RegularFunction(Consts_1.RegularOperator.EQUAL, equality);
        return (0, Helpers_1.bool)(op.apply([left.subject, right.subject], context).coerceEBV() &&
            op.apply([left.predicate, right.predicate], context).coerceEBV() &&
            op.apply([left.object, right.object], context).coerceEBV());
    }, false)
        .set(['term', 'term'], () => ([left, right]) => (0, Helpers_1.bool)(RDFTermEqual(left, right)), false)
        .set([Consts_1.TypeURL.XSD_DURATION, Consts_1.TypeURL.XSD_DURATION], () => ([dur1, dur2]) => (0, Helpers_1.bool)((0, DateTimeHelpers_1.yearMonthDurationsToMonths)((0, DateTimeHelpers_1.defaultedYearMonthDurationRepresentation)(dur1.typedValue)) ===
        (0, DateTimeHelpers_1.yearMonthDurationsToMonths)((0, DateTimeHelpers_1.defaultedYearMonthDurationRepresentation)(dur2.typedValue)) &&
        (0, DateTimeHelpers_1.dayTimeDurationsToSeconds)((0, DateTimeHelpers_1.defaultedDayTimeDurationRepresentation)(dur1.typedValue)) ===
            (0, DateTimeHelpers_1.dayTimeDurationsToSeconds)((0, DateTimeHelpers_1.defaultedDayTimeDurationRepresentation)(dur2.typedValue))))
        .set([Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_TIME], ({ defaultTimeZone }) => ([time1, time2]) => 
    // https://www.w3.org/TR/xpath-functions/#func-time-equal
    (0, Helpers_1.bool)((0, DateTimeHelpers_1.toUTCDate)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time1.typedValue), defaultTimeZone).getTime() ===
        (0, DateTimeHelpers_1.toUTCDate)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time2.typedValue), defaultTimeZone).getTime()))
        .collect(),
};
function RDFTermEqual(_left, _right) {
    const left = _left.toRDF();
    const right = _right.toRDF();
    const val = left.equals(right);
    if (!val && (left.termType === 'Literal') && (right.termType === 'Literal')) {
        throw new Err.RDFEqualTypeError([_left, _right]);
    }
    return val;
}
const inequality = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.NOT_EQUAL)
        .set(['term', 'term'], context => ([first, second]) => (0, Helpers_1.bool)(!_1.regularFunctions[C.RegularOperator.EQUAL]
        .apply([first, second], context).typedValue))
        .collect(),
};
const lesserThan = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.LT)
        .numberTest(() => (left, right) => left < right)
        .stringTest(() => (left, right) => left.localeCompare(right) === -1)
        .booleanTest(() => (left, right) => left < right)
        .set(['quad', 'quad'], () => ([left, right]) => (0, Helpers_1.bool)((0, Ordering_1.orderTypes)(left.toRDF(), right.toRDF(), true) === -1), false)
        .dateTimeTest(({ defaultTimeZone }) => (left, right) => (0, DateTimeHelpers_1.toUTCDate)(left, defaultTimeZone).getTime() < (0, DateTimeHelpers_1.toUTCDate)(right, defaultTimeZone).getTime())
        .copy({
        // https://www.w3.org/TR/xpath-functions/#func-date-less-than
        from: [Consts_1.TypeURL.XSD_DATE_TIME, Consts_1.TypeURL.XSD_DATE_TIME],
        to: [Consts_1.TypeURL.XSD_DATE, Consts_1.TypeURL.XSD_DATE],
    })
        .set([Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION, Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION], () => ([dur1L, dur2L]) => 
    // https://www.w3.org/TR/xpath-functions/#func-yearMonthDuration-less-than
    (0, Helpers_1.bool)((0, DateTimeHelpers_1.yearMonthDurationsToMonths)((0, DateTimeHelpers_1.defaultedYearMonthDurationRepresentation)(dur1L.typedValue)) <
        (0, DateTimeHelpers_1.yearMonthDurationsToMonths)((0, DateTimeHelpers_1.defaultedYearMonthDurationRepresentation)(dur2L.typedValue))))
        .set([Consts_1.TypeURL.XSD_DAY_TIME_DURATION, Consts_1.TypeURL.XSD_DAY_TIME_DURATION], () => ([dur1, dur2]) => 
    // https://www.w3.org/TR/xpath-functions/#func-dayTimeDuration-greater-than
    (0, Helpers_1.bool)((0, DateTimeHelpers_1.dayTimeDurationsToSeconds)((0, DateTimeHelpers_1.defaultedDayTimeDurationRepresentation)(dur1.typedValue)) <
        (0, DateTimeHelpers_1.dayTimeDurationsToSeconds)((0, DateTimeHelpers_1.defaultedDayTimeDurationRepresentation)(dur2.typedValue))))
        .set([Consts_1.TypeURL.XSD_TIME, Consts_1.TypeURL.XSD_TIME], ({ defaultTimeZone }) => ([time1, time2]) => 
    // https://www.w3.org/TR/xpath-functions/#func-time-less-than
    (0, Helpers_1.bool)((0, DateTimeHelpers_1.toUTCDate)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time1.typedValue), defaultTimeZone).getTime() <
        (0, DateTimeHelpers_1.toUTCDate)((0, DateTimeHelpers_1.defaultedDateTimeRepresentation)(time2.typedValue), defaultTimeZone).getTime()))
        .collect(),
};
const greaterThan = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.GT)
        .set(['term', 'term'], context => ([first, second]) => 
    // X < Y -> Y > X
    _1.regularFunctions[C.RegularOperator.LT].apply([second, first], context))
        .collect(),
};
const lesserThanEqual = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.LTE)
        .set(['term', 'term'], context => ([first, second]) => 
    // X <= Y -> X < Y || X = Y
    // First check if the first is lesser than the second, then check if they are equal.
    // Doing this, the correct error will be thrown, each type that has a lesserThanEqual has a matching lesserThan.
    (0, Helpers_1.bool)(_1.regularFunctions[C.RegularOperator.LT].apply([first, second], context).typedValue ||
        _1.regularFunctions[C.RegularOperator.EQUAL].apply([first, second], context).typedValue))
        .collect(),
};
const greaterThanEqual = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.GTE)
        .set(['term', 'term'], context => ([first, second]) => 
    // X >= Y -> Y <= X
    _1.regularFunctions[C.RegularOperator.LTE].apply([second, first], context))
        .collect(),
};
// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
const isIRI = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IS_IRI)
        .onTerm1(() => term => (0, Helpers_1.bool)(term.termType === 'namedNode'))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
const isBlank = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IS_BLANK)
        .onTerm1(() => term => (0, Helpers_1.bool)(term.termType === 'blankNode'))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
const isLiteral = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IS_LITERAL)
        .onTerm1(() => term => (0, Helpers_1.bool)(term.termType === 'literal'))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
const isNumeric = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IS_NUMERIC)
        .onNumeric1(() => () => (0, Helpers_1.bool)(true))
        .onTerm1(() => () => (0, Helpers_1.bool)(false))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
const STR = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STR)
        .onTerm1(() => term => (0, Helpers_1.string)(term.str()))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
const lang = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.LANG)
        .onLiteral1(() => lit => (0, Helpers_1.string)(lit.language ?? ''))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
const datatype = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.DATATYPE)
        .onLiteral1(() => lit => new E.NamedNode(lit.dataType))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
const IRI = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IRI)
        .set(['namedNode'], context => (args) => {
        const lit = args[0];
        const iri = (0, relative_to_absolute_iri_1.resolve)(lit.str(), context.baseIRI ?? '');
        return new E.NamedNode(iri);
    })
        .onString1(context => (lit) => {
        const iri = (0, relative_to_absolute_iri_1.resolve)(lit.str(), context.baseIRI ?? '');
        return new E.NamedNode(iri);
    })
        .collect(),
};
// See special functions
// const BNODE = {};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
const STRDT = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRDT).set([Consts_1.TypeURL.XSD_STRING, 'namedNode'], ({ superTypeProvider }) => ([str, iri]) => {
        const lit = DF.literal(str.typedValue, DF.namedNode(iri.value));
        return new TermTransformer_1.TermTransformer(superTypeProvider).transformLiteral(lit);
    }).collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
const STRLANG = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRLANG)
        .onBinaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (val, language) => new E.LangStringLiteral(val, language.toLowerCase()))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
const UUID = {
    arity: 0,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.UUID)
        .set([], () => () => new E.NamedNode(`urn:uuid:${uuid.v4()}`))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
const STRUUID = {
    arity: 0,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRUUID)
        .set([], () => () => (0, Helpers_1.string)(uuid.v4()))
        .collect(),
};
// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-strlen
 */
const STRLEN = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRLEN)
        .onStringly1(() => str => (0, Helpers_1.integer)([...str.typedValue].length))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
const SUBSTR = {
    arity: [2, 3],
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SUBSTR)
        .onBinaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_INTEGER], () => (source, startingLoc) => (0, Helpers_1.string)([...source].slice(startingLoc - 1).join('')))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.XSD_INTEGER], () => (source, startingLoc) => {
        const sub = [...source.typedValue].slice(startingLoc.typedValue - 1).join('');
        return (0, Helpers_1.langString)(sub, source.language);
    })
        .onTernaryTyped([
        Consts_1.TypeURL.XSD_STRING,
        Consts_1.TypeURL.XSD_INTEGER,
        Consts_1.TypeURL.XSD_INTEGER,
    ], () => (source, startingLoc, length) => (0, Helpers_1.string)([...source].slice(startingLoc - 1, length + startingLoc - 1).join('')))
        .onTernary([
        Consts_1.TypeURL.RDF_LANG_STRING,
        Consts_1.TypeURL.XSD_INTEGER,
        Consts_1.TypeURL.XSD_INTEGER,
    ], () => (source, startingLoc, length) => {
        const sub = [...source.typedValue]
            .slice(startingLoc.typedValue - 1, length.typedValue + startingLoc.typedValue - 1).join('');
        return (0, Helpers_1.langString)(sub, source.language);
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-ucase
 */
const UCASE = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.UCASE)
        .onString1Typed(() => lit => (0, Helpers_1.string)(lit.toUpperCase()))
        .onLangString1(() => lit => (0, Helpers_1.langString)(lit.typedValue.toUpperCase(), lit.language))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
const LCASE = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.LCASE)
        .onString1Typed(() => lit => (0, Helpers_1.string)(lit.toLowerCase()))
        .onLangString1(() => lit => (0, Helpers_1.langString)(lit.typedValue.toLowerCase(), lit.language))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
const STRSTARTS = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRSTARTS)
        .onBinaryTyped([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => (0, Helpers_1.bool)(arg1.startsWith(arg2)))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => (arg1, arg2) => {
        if (arg1.language !== arg2.language) {
            throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return (0, Helpers_1.bool)(arg1.typedValue.startsWith(arg2.typedValue));
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
const STRENDS = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRENDS)
        .onBinaryTyped([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => (0, Helpers_1.bool)(arg1.endsWith(arg2)))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => (arg1, arg2) => {
        if (arg1.language !== arg2.language) {
            throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return (0, Helpers_1.bool)(arg1.typedValue.endsWith(arg2.typedValue));
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
const CONTAINS = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.CONTAINS)
        .onBinaryTyped([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => (0, Helpers_1.bool)(arg1.includes(arg2)))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => (arg1, arg2) => {
        if (arg1.language !== arg2.language) {
            throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return (0, Helpers_1.bool)(arg1.typedValue.includes(arg2.typedValue));
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strbefore
 */
const STRBEFORE = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRBEFORE)
        .onBinaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => (0, Helpers_1.string)(arg1.slice(0, Math.max(0, arg1.indexOf(arg2)))))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => {
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? (0, Helpers_1.langString)(sub, arg1.language) : (0, Helpers_1.string)(sub);
    })
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => (arg1, arg2) => {
        if (arg1.language !== arg2.language) {
            throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? (0, Helpers_1.langString)(sub, arg1.language) : (0, Helpers_1.string)(sub);
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strafter
 */
const STRAFTER = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.STRAFTER)
        .onBinaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => (0, Helpers_1.string)(arg1.slice(arg1.indexOf(arg2)).slice(arg2.length)))
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg1, arg2) => {
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? (0, Helpers_1.langString)(sub, arg1.language) : (0, Helpers_1.string)(sub);
    })
        .onBinary([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.RDF_LANG_STRING], () => (arg1, arg2) => {
        if (arg1.language !== arg2.language) {
            throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? (0, Helpers_1.langString)(sub, arg1.language) : (0, Helpers_1.string)(sub);
    })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
const ENCODE_FOR_URI = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.ENCODE_FOR_URI)
        .onStringly1Typed(() => val => (0, Helpers_1.string)(encodeURI(val))).collect(),
};
// See special operators
// const CONCAT = {}
/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
const langmatches = {
    arity: 2,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.LANG_MATCHES)
        .onBinaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (tag, range) => (0, Helpers_1.bool)(X.langMatches(tag, range))).collect(),
};
function regex2() {
    return (text, pattern) => (0, Helpers_1.bool)(X.matches(text, pattern));
}
function regex3() {
    return (text, pattern, flags) => (0, Helpers_1.bool)(X.matches(text, pattern, flags));
}
/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
const REGEX = {
    arity: [2, 3],
    overloads: (0, Helpers_1.declare)(C.RegularOperator.REGEX)
        .onBinaryTyped([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeURL.XSD_STRING], regex2)
        .onTernaryTyped([Consts_1.TypeAlias.SPARQL_STRINGLY, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], regex3)
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
const REPLACE = {
    arity: [3, 4],
    overloads: (0, Helpers_1.declare)(C.RegularOperator.REPLACE)
        .onTernaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg, pattern, replacement) => (0, Helpers_1.string)(X.replace(arg, pattern, replacement)))
        .set([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => ([arg, pattern, replacement]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
        return (0, Helpers_1.langString)(result, arg.language);
    })
        .onQuaternaryTyped([Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => (arg, pattern, replacement, flags) => (0, Helpers_1.string)(X.replace(arg, pattern, replacement, flags)))
        .set([Consts_1.TypeURL.RDF_LANG_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING, Consts_1.TypeURL.XSD_STRING], () => ([arg, pattern, replacement, flags]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue, flags.typedValue);
        return (0, Helpers_1.langString)(result, arg.language);
    })
        .collect(),
};
// ----------------------------------------------------------------------------
// Functions on numerics
// https://www.w3.org/TR/sparql11-query/#func-numerics
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-abs
 */
const abs = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.ABS)
        .numericConverter(() => num => Math.abs(num))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
const round = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.ROUND)
        .numericConverter(() => num => Math.round(num))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
const ceil = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.CEIL)
        .numericConverter(() => num => Math.ceil(num))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
const floor = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.FLOOR)
        .numericConverter(() => num => Math.floor(num))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
const rand = {
    arity: 0,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.RAND)
        .set([], () => () => (0, Helpers_1.double)(Math.random()))
        .collect(),
};
// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-now
 */
const now = {
    arity: 0,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.NOW).set([], (sharedContext) => () => new E.DateTimeLiteral((0, DateTimeHelpers_1.toDateTimeRepresentation)({ date: sharedContext.now, timeZone: sharedContext.defaultTimeZone }))).collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
const year = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.YEAR)
        .onDateTime1(() => date => (0, Helpers_1.integer)(date.typedValue.year))
        .set([Consts_1.TypeURL.XSD_DATE], () => ([date]) => (0, Helpers_1.integer)(date.typedValue.year))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
const month = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.MONTH)
        .onDateTime1(() => date => (0, Helpers_1.integer)(date.typedValue.month))
        .set([Consts_1.TypeURL.XSD_DATE], () => ([date]) => (0, Helpers_1.integer)(date.typedValue.month))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
const day = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.DAY)
        .onDateTime1(() => date => (0, Helpers_1.integer)(date.typedValue.day))
        .set([Consts_1.TypeURL.XSD_DATE], () => ([date]) => (0, Helpers_1.integer)(date.typedValue.day))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
const hours = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.HOURS)
        .onDateTime1(() => date => (0, Helpers_1.integer)(date.typedValue.hours))
        .set([Consts_1.TypeURL.XSD_TIME], () => ([time]) => (0, Helpers_1.integer)(time.typedValue.hours))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
const minutes = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.MINUTES)
        .onDateTime1(() => date => (0, Helpers_1.integer)(date.typedValue.minutes))
        .set([Consts_1.TypeURL.XSD_TIME], () => ([time]) => (0, Helpers_1.integer)(time.typedValue.minutes))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
const seconds = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SECONDS)
        .onDateTime1(() => date => (0, Helpers_1.decimal)(date.typedValue.seconds))
        .set([Consts_1.TypeURL.XSD_TIME], () => ([time]) => (0, Helpers_1.integer)(time.typedValue.seconds))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
const timezone = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.TIMEZONE)
        .onDateTime1(() => (date) => {
        const duration = {
            hours: date.typedValue.zoneHours,
            minutes: date.typedValue.zoneMinutes,
        };
        if (duration.hours === undefined && duration.minutes === undefined) {
            throw new Err.InvalidTimezoneCall(date.str());
        }
        return new E.DayTimeDurationLiteral(duration);
    })
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_DATE] })
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_TIME] })
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
const tz = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.TZ)
        .onDateTime1(() => date => (0, Helpers_1.string)((0, DateTimeHelpers_1.extractRawTimeZone)(date.str())))
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_DATE] })
        .copy({ from: [Consts_1.TypeURL.XSD_DATE_TIME], to: [Consts_1.TypeURL.XSD_TIME] })
        .collect(),
};
// ----------------------------------------------------------------------------
// Hash functions
// https://www.w3.org/TR/sparql11-query/#func-hash
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/sparql11-query/#func-md5
 */
const MD5 = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.MD5)
        .onString1Typed(() => str => (0, Helpers_1.string)((0, spark_md5_1.hash)(str)))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
const SHA1 = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SHA1)
        .onString1Typed(() => str => (0, Helpers_1.string)((0, hash_js_1.sha1)().update(str).digest('hex')))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
const SHA256 = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SHA256)
        .onString1Typed(() => str => (0, Helpers_1.string)((0, hash_js_1.sha256)().update(str).digest('hex')))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
const SHA384 = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SHA384)
        .onString1Typed(() => str => (0, Helpers_1.string)((0, hash_js_1.sha384)().update(str).digest('hex')))
        .collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
const SHA512 = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SHA512)
        .onString1Typed(() => str => (0, Helpers_1.string)((0, hash_js_1.sha512)().update(str).digest('hex')))
        .collect(),
};
// ----------------------------------------------------------------------------
// Functions for quoted triples
// https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
// ----------------------------------------------------------------------------
/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
 */
const triple = {
    arity: 3,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.TRIPLE)
        .onTerm3(context => (...args) => new E.Quad(DF.quad(args[0].toRDF(), args[1].toRDF(), args[2].toRDF()), context.superTypeProvider))
        .collect(),
};
/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#subject
 */
const subject = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.SUBJECT)
        .onQuad1(() => quad => quad.subject)
        .collect(),
};
/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#predicate
 */
const predicate = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.PREDICATE)
        .onQuad1(() => quad => quad.predicate)
        .collect(),
};
/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#object
 */
const object = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.OBJECT)
        .onQuad1(() => quad => quad.object)
        .collect(),
};
/**
 * https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#istriple
 */
const istriple = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(C.RegularOperator.IS_TRIPLE)
        .onTerm1(() => term => (0, Helpers_1.bool)(term.termType === 'quad'))
        .collect(),
};
// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
/**
 * Collect all the definitions from above into an object
 */
exports.definitions = {
    // --------------------------------------------------------------------------
    // Operator Mapping
    // https://www.w3.org/TR/sparql11-query/#OperatorMapping
    // --------------------------------------------------------------------------
    '!': not,
    uplus: unaryPlus,
    uminus: unaryMinus,
    '*': multiplication,
    '/': division,
    '+': addition,
    '-': subtraction,
    '=': equality,
    '!=': inequality,
    '<': lesserThan,
    '>': greaterThan,
    '<=': lesserThanEqual,
    '>=': greaterThanEqual,
    // --------------------------------------------------------------------------
    // Functions on RDF Terms
    // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
    // --------------------------------------------------------------------------
    isiri: isIRI,
    isuri: isIRI,
    isblank: isBlank,
    isliteral: isLiteral,
    isnumeric: isNumeric,
    str: STR,
    lang,
    datatype,
    iri: IRI,
    uri: IRI,
    // 'BNODE': BNODE (see special operators),
    strdt: STRDT,
    strlang: STRLANG,
    uuid: UUID,
    struuid: STRUUID,
    // --------------------------------------------------------------------------
    // Functions on strings
    // https://www.w3.org/TR/sparql11-query/#func-forms
    // --------------------------------------------------------------------------
    strlen: STRLEN,
    substr: SUBSTR,
    ucase: UCASE,
    lcase: LCASE,
    strstarts: STRSTARTS,
    strends: STRENDS,
    contains: CONTAINS,
    strbefore: STRBEFORE,
    strafter: STRAFTER,
    encode_for_uri: ENCODE_FOR_URI,
    // 'concat': CONCAT (see special operators)
    langmatches,
    regex: REGEX,
    replace: REPLACE,
    // --------------------------------------------------------------------------
    // Functions on numerics
    // https://www.w3.org/TR/sparql11-query/#func-numerics
    // --------------------------------------------------------------------------
    abs,
    round,
    ceil,
    floor,
    rand,
    // --------------------------------------------------------------------------
    // Functions on Dates and Times
    // https://www.w3.org/TR/sparql11-query/#func-date-time
    // --------------------------------------------------------------------------
    now,
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    timezone,
    tz,
    // --------------------------------------------------------------------------
    // Hash functions
    // https://www.w3.org/TR/sparql11-query/#func-hash
    // --------------------------------------------------------------------------
    md5: MD5,
    sha1: SHA1,
    sha256: SHA256,
    sha384: SHA384,
    sha512: SHA512,
    // --------------------------------------------------------------------------
    // Functions for quoted triples
    // https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
    // --------------------------------------------------------------------------
    triple,
    subject,
    predicate,
    object,
    istriple,
};
//# sourceMappingURL=RegularFunctions.js.map