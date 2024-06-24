"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Named = void 0;
const Expressions_1 = require("./Expressions");
class Named {
    constructor(name, args, apply) {
        this.name = name;
        this.args = args;
        this.apply = apply;
        this.expressionType = Expressions_1.ExpressionType.Named;
    }
}
exports.Named = Named;
//# sourceMappingURL=Named.js.map