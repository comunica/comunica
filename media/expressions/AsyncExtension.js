"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncExtension = void 0;
const Expressions_1 = require("./Expressions");
class AsyncExtension {
    constructor(name, args, apply) {
        this.name = name;
        this.args = args;
        this.apply = apply;
        this.expressionType = Expressions_1.ExpressionType.AsyncExtension;
    }
}
exports.AsyncExtension = AsyncExtension;
//# sourceMappingURL=AsyncExtension.js.map