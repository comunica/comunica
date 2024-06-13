// The following is only possible from Node 18 onwards
import pkg from "./package.json" assert { type: "json" };
import sharedConfig from "@inrupt/base-rollup-config";

export default sharedConfig(pkg);
