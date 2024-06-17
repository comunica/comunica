import { CONTEXT_KEY_LOGGER } from "./packages/core/lib/index.js";
console.log(CONTEXT_KEY_LOGGER);
// import { translate } from "sparqlalgebrajs";
import { range } from "asynciterator";

// console.log(translate("SELECT * WHERE { ?s ?p ?o }"));

for await (const item of range(1, 1e4)) {
  console.log(item);
}
