"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialOperator = void 0;
const Expressions_1 = require("./Expressions");
class SpecialOperator {
    constructor(args, applyAsync, applySynchronously) {
        this.args = args;
        this.applyAsync = applyAsync;
        this.applySynchronously = applySynchronously;
        this.expressionType = Expressions_1.ExpressionType.SpecialOperator;
    }
}
exports.SpecialOperator = SpecialOperator;
//# sourceMappingURL=SpecialOperator.js.map