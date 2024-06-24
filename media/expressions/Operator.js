"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operator = void 0;
const Expressions_1 = require("./Expressions");
class Operator {
    constructor(args, apply) {
        this.args = args;
        this.apply = apply;
        this.expressionType = Expressions_1.ExpressionType.Operator;
    }
}
exports.Operator = Operator;
//# sourceMappingURL=Operator.js.map