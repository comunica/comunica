"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.namedDefinitions = void 0;
const E = require("../expressions");
const expressions_1 = require("../expressions");
const Consts_1 = require("../util/Consts");
const DateTimeHelpers_1 = require("../util/DateTimeHelpers");
const Err = require("../util/Errors");
const Parsing_1 = require("../util/Parsing");
const Helpers_1 = require("./Helpers");
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions.
// ----------------------------------------------------------------------------
// XPath Constructor functions
// https://www.w3.org/TR/sparql11-query/#
// https://www.w3.org/TR/xpath-functions/#casting-from-primitive-to-primitive
// ----------------------------------------------------------------------------
/**
 * https://www.w3.org/TR/xpath-functions/#casting-to-string
 */
const xsdToString = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_STRING)
        .onNumeric1(() => (val) => (0, Helpers_1.string)((0, Helpers_1.float)(val.typedValue).str()))
        .onBoolean1Typed(() => val => (0, Helpers_1.string)((0, Helpers_1.bool)(val).str()))
        .onTerm1(() => (val) => (0, Helpers_1.string)(val.str()))
        .collect(),
};
const xsdToFloat = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_FLOAT)
        .onNumeric1(() => (val) => (0, Helpers_1.float)(val.typedValue))
        .onBoolean1Typed(() => val => (0, Helpers_1.float)(val ? 1 : 0))
        .onUnary(Consts_1.TypeURL.XSD_STRING, () => (val) => {
        const result = (0, Parsing_1.parseXSDFloat)(val.str());
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_FLOAT);
        }
        return (0, Helpers_1.float)(result);
    }, false)
        .collect(),
};
const xsdToDouble = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DOUBLE)
        .onNumeric1(() => (val) => (0, Helpers_1.double)(val.typedValue))
        .onBoolean1Typed(() => val => (0, Helpers_1.double)(val ? 1 : 0))
        .onUnary(Consts_1.TypeURL.XSD_STRING, () => (val) => {
        const result = (0, Parsing_1.parseXSDFloat)(val.str());
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_DOUBLE);
        }
        return (0, Helpers_1.double)(result);
    }, false)
        .collect(),
};
const xsdToDecimal = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DECIMAL)
        .onNumeric1(() => (val) => {
        const result = (0, Parsing_1.parseXSDDecimal)(val.str());
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_DECIMAL);
        }
        return (0, Helpers_1.decimal)(result);
    })
        .onString1(() => (val) => {
        const str = val.str();
        const result = /^([+-])?(\d+(\.\d+)?)$/u.test(str) ? (0, Parsing_1.parseXSDDecimal)(str) : undefined;
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_DECIMAL);
        }
        return (0, Helpers_1.decimal)(result);
    }, false)
        .onBoolean1Typed(() => val => (0, Helpers_1.decimal)(val ? 1 : 0))
        .collect(),
};
const xsdToInteger = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_INTEGER)
        .onBoolean1Typed(() => val => (0, Helpers_1.integer)(val ? 1 : 0))
        .onNumeric1(() => (val) => {
        const result = (0, Parsing_1.parseXSDInteger)(val.str());
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_INTEGER);
        }
        return (0, Helpers_1.integer)(result);
    }, false)
        .onString1(() => (val) => {
        const str = val.str();
        const result = /^\d+$/u.test(str) ? (0, Parsing_1.parseXSDInteger)(str) : undefined;
        if (result === undefined) {
            throw new Err.CastError(val, Consts_1.TypeURL.XSD_INTEGER);
        }
        return (0, Helpers_1.integer)(result);
    })
        .collect(),
};
const xsdToDatetime = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DATE_TIME)
        .onUnary(Consts_1.TypeURL.XSD_DATE_TIME, () => (val) => val)
        .onUnary(Consts_1.TypeURL.XSD_STRING, () => (val) => (0, Helpers_1.dateTime)((0, Parsing_1.parseDateTime)(val.str()), val.str()), false)
        .onUnary(Consts_1.TypeURL.XSD_DATE, () => (val) => new E.DateTimeLiteral({ ...val.typedValue, hours: 0, minutes: 0, seconds: 0 }))
        .collect(),
};
const xsdToBoolean = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_BOOLEAN)
        .onNumeric1(() => (val) => (0, Helpers_1.bool)(val.coerceEBV()), true)
        .onUnary(Consts_1.TypeURL.XSD_BOOLEAN, () => (val) => (0, Helpers_1.bool)(val.coerceEBV()), true)
        .onUnary(Consts_1.TypeURL.XSD_STRING, () => (val) => {
        switch (val.str()) {
            case 'true':
                return (0, Helpers_1.bool)(true);
            case 'false':
                return (0, Helpers_1.bool)(false);
            case '1':
                return (0, Helpers_1.bool)(true);
            case '0':
                return (0, Helpers_1.bool)(false);
            default:
                throw new Err.CastError(val, Consts_1.TypeURL.XSD_BOOLEAN);
        }
    }, false)
        .collect(),
};
// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Additional definitions to implement https://github.com/w3c/sparql-12/blob/main/SEP/SEP-0002/sep-0002.md
// The additional casts are listed in https://www.w3.org/TR/xpath-functions/#casting-from-primitive-to-primitive
const xsdToTime = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_TIME)
        .onUnary(Consts_1.TypeURL.XSD_TIME, () => (val) => new E.TimeLiteral(val.typedValue, val.strValue))
        .onUnary(Consts_1.TypeURL.XSD_DATE_TIME, () => (val) => new E.TimeLiteral(val.typedValue))
        .onStringly1(() => (val) => new E.TimeLiteral((0, Parsing_1.parseTime)(val.str())))
        .collect(),
};
const xsdToDate = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DATE)
        .onUnary(Consts_1.TypeURL.XSD_DATE, () => (val) => new E.DateLiteral(val.typedValue, val.strValue))
        .onUnary(Consts_1.TypeURL.XSD_DATE_TIME, () => (val) => new E.DateLiteral(val.typedValue))
        .onStringly1(() => (val) => new E.DateLiteral((0, Parsing_1.parseDate)(val.str())))
        .collect(),
};
const xsdToDuration = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(Consts_1.TypeURL.XSD_DURATION, () => (val) => 
    // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
    new E.DurationLiteral(val.typedValue, val.strValue))
        .onStringly1(() => (val) => new expressions_1.DurationLiteral((0, Parsing_1.parseDuration)(val.str())))
        .collect(),
};
const xsdToDayTimeDuration = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_DAY_TIME_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(Consts_1.TypeURL.XSD_DURATION, () => (val) => 
    // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
    new E.DayTimeDurationLiteral((0, DateTimeHelpers_1.trimToDayTimeDuration)(val.typedValue)))
        .onStringly1(() => (val) => new E.DayTimeDurationLiteral((0, Parsing_1.parseDayTimeDuration)(val.str())))
        .collect(),
};
const xsdToYearMonthDuration = {
    arity: 1,
    overloads: (0, Helpers_1.declare)(Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION)
        // https://www.w3.org/TR/xpath-functions/#casting-to-durations
        .onUnary(Consts_1.TypeURL.XSD_DURATION, () => (val) => 
    // Copy is needed to make sure the dataType is changed, even when the provided type was a subtype
    new E.YearMonthDurationLiteral((0, DateTimeHelpers_1.trimToYearMonthDuration)(val.typedValue)))
        .onStringly1(() => (val) => new E.YearMonthDurationLiteral((0, Parsing_1.parseYearMonthDuration)(val.str())))
        .collect(),
};
exports.namedDefinitions = {
    // --------------------------------------------------------------------------
    // XPath Constructor functions
    // https://www.w3.org/TR/sparql11-query/#FunctionMapping
    // --------------------------------------------------------------------------
    [Consts_1.TypeURL.XSD_STRING]: xsdToString,
    [Consts_1.TypeURL.XSD_FLOAT]: xsdToFloat,
    [Consts_1.TypeURL.XSD_DOUBLE]: xsdToDouble,
    [Consts_1.TypeURL.XSD_DECIMAL]: xsdToDecimal,
    [Consts_1.TypeURL.XSD_INTEGER]: xsdToInteger,
    [Consts_1.TypeURL.XSD_DATE_TIME]: xsdToDatetime,
    [Consts_1.TypeURL.XSD_DATE]: xsdToDate,
    [Consts_1.TypeURL.XSD_BOOLEAN]: xsdToBoolean,
    [Consts_1.TypeURL.XSD_TIME]: xsdToTime,
    [Consts_1.TypeURL.XSD_DURATION]: xsdToDuration,
    [Consts_1.TypeURL.XSD_DAY_TIME_DURATION]: xsdToDayTimeDuration,
    [Consts_1.TypeURL.XSD_YEAR_MONTH_DURATION]: xsdToYearMonthDuration,
};
//# sourceMappingURL=NamedFunctions.js.map