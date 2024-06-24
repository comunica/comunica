"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asTermType = exports.ExpressionType = void 0;
var ExpressionType;
(function (ExpressionType) {
    ExpressionType["Aggregate"] = "aggregate";
    ExpressionType["Existence"] = "existence";
    ExpressionType["Named"] = "named";
    ExpressionType["Operator"] = "operator";
    ExpressionType["SpecialOperator"] = "specialOperator";
    ExpressionType["Term"] = "term";
    ExpressionType["Variable"] = "variable";
    ExpressionType["AsyncExtension"] = "asyncExtension";
    ExpressionType["SyncExtension"] = "syncExtension";
})(ExpressionType || (exports.ExpressionType = ExpressionType = {}));
// TODO: Create alias Term = TermExpression
function asTermType(type) {
    if (type === 'namedNode' || type === 'literal' || type === 'blankNode' || type === 'quad') {
        return type;
    }
    return undefined;
}
exports.asTermType = asTermType;
//# sourceMappingURL=Expressions.js.map