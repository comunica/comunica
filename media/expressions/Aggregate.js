"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Aggregate = void 0;
const Expressions_1 = require("./Expressions");
class Aggregate {
    constructor(name, expression) {
        this.name = name;
        this.expression = expression;
        this.expressionType = Expressions_1.ExpressionType.Aggregate;
    }
}
exports.Aggregate = Aggregate;
//# sourceMappingURL=Aggregate.js.map