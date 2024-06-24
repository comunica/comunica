"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variable = void 0;
const Expressions_1 = require("./Expressions");
class Variable {
    constructor(name) {
        this.expressionType = Expressions_1.ExpressionType.Variable;
        this.name = name;
    }
}
exports.Variable = Variable;
//# sourceMappingURL=Variable.js.map