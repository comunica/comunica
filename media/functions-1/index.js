"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverloadTree = exports.namedFunctions = exports.specialFunctions = exports.regularFunctions = void 0;
const Core_1 = require("./Core");
const NamedFunctions_1 = require("./NamedFunctions");
const RegularFunctions_1 = require("./RegularFunctions");
const SpecialFunctions_1 = require("./SpecialFunctions");
__exportStar(require("./Core"), exports);
exports.regularFunctions = Object.fromEntries(Object.entries(RegularFunctions_1.definitions).map(([key, val]) => [key, new Core_1.RegularFunction(key, val)]));
exports.specialFunctions = Object.fromEntries(Object.entries(SpecialFunctions_1.specialDefinitions).map(([key, val]) => [key, new Core_1.SpecialFunction(key, val)]));
exports.namedFunctions = Object.fromEntries(Object.entries(NamedFunctions_1.namedDefinitions).map(([key, val]) => [key, new Core_1.NamedFunction(key, val)]));
var OverloadTree_1 = require("./OverloadTree");
Object.defineProperty(exports, "OverloadTree", { enumerable: true, get: function () { return OverloadTree_1.OverloadTree; } });
//# sourceMappingURL=index.js.map