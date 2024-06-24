"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncExtension = void 0;
const Expressions_1 = require("./Expressions");
class SyncExtension {
    constructor(name, args, apply) {
        this.name = name;
        this.args = args;
        this.apply = apply;
        this.expressionType = Expressions_1.ExpressionType.SyncExtension;
    }
}
exports.SyncExtension = SyncExtension;
//# sourceMappingURL=SyncExtension.js.map