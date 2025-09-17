import {
  getSolidDataset,
  saveSolidDatasetAt,
  saveFileInContainer,
  createThing,
  buildThing,
  setThing,
  Thing,
  SolidDataset,
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-node";
import { Parser as SparqlParser } from "sparqljs";
import type { IQueryOperationResultBindings } from "@comunica/types";

const session = new Session();
const authFetch = session.fetch.bind(session);

/**
 * Generates a unique 6-character hash using alphanumeric characters.
 * @param length - Length for the hash
 * @returns A string representing the hash.
 */
function generateHash(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    hash += charset.charAt(randomIndex);
  }
  return hash;
}

/**
 * Ensures that a container exists at the given URL.
 *
 * @param providedCache - The URL of the container (should end with a slash, e.g., "https://pod.example.com/").
 * @returns boolean representing if the querycache container could be found.
 */
export async function ensureCacheContainer(
  providedCache: string
): Promise<boolean> {
  let cacheUrl: string;
  // check if url contains querycache
  if (!providedCache.endsWith("/")) {
    cacheUrl = providedCache + "/";
  } else {
    cacheUrl = providedCache;
  }

  try {
    // Try to retrieve the dataset (container) ++ Queries.ttl file
    await getSolidDataset(cacheUrl, { fetch: authFetch });
    await getSolidDataset(cacheUrl + "Queries.ttl", { fetch: authFetch });
    return true;
  } catch (error: any) {
    // If not found, create the container (if it is the users pod in question)
    return false;
  }
}

/**
 * Recursively builds an RDF list (using rdf:first / rdf:rest) from an array of IRI strings.
 *
 * @param sources - An array of IRI strings.
 * @returns An object with:
 *    - head: A Thing representing the head of the RDF list.
 *    - nodes: An array of all list node Things (to be added to your dataset).
 */
function buildRdfList(sources: string[]): { head: Thing; nodes: Thing[] } {
  const RDF_FIRST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
  const RDF_REST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
  const RDF_NIL = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

  if (sources.length === 0) {
    // For an empty list, return rdf:nil.
    return { head: createThing({ url: RDF_NIL }), nodes: [] };
  }

  // Create a blank node for the current list element.
  let listNode = createThing(); // creates a blank node automatically
  listNode = buildThing(listNode).addIri(RDF_FIRST, sources[0]).build();

  // Recursively build the rest of the list.
  const restList = buildRdfList(sources.slice(1));

  // Link the current node to the head of the rest of the list.
  listNode = buildThing(listNode).addIri(RDF_REST, restList.head.url).build();

  // Return the current node as the head and include all nodes.
  return { head: listNode, nodes: [listNode, ...restList.nodes] };
}

/**
 * Edits a pre-existing Queries.ttl file in a specified querycache container.
 *
 * Each query is converted into an entry like:
 *
 *     <hash1> a Query;
 *         queryFile "hash1.rq";
 *         queryText """ ... """;
 *         resultsFile "hash1.sparqljson";
 *         Sources "<url>";
 *         date "date"^^xsdDate.
 *
 * @param containerUrl - The container URL (should end with a slash).
 * @param sources - An array of source URLs.
 * @param fileName - The file name to use (default: "queries.ttl").
 * @returns The hash of the query added to queries.ttl.
 */
export async function updateQueriesTTL(
  containerUrl: string,
  query: string,
  sources: string[],
  fileName = "queries.ttl"
): Promise<string> {
  // Initiatize query cache variables
  const hash = generateHash(6);
  const queryFile = `${hash}.rq`;
  const queryResult = `${hash}.json`;

  // prefixes
  const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const CREATED = "http://purl.org/dc/terms/created";
  const QUERYprop =
    "http://www.w3.org/2001/sw/DataAccess/tests/test-query#query";
  const sh = "http://www.w3.org/ns/shacl#";
  const QUERYsuperclass =
    "http://www.w3.org/2001/sw/DataAccess/tests/test-query#QueryForm";
  const QUERYSELsubclass =
    "http://www.w3.org/2001/sw/DataAccess/tests/test-query#QuerySelect";
  // TODO: create conditional to allow for labelling of non-select queries...
  const RESULT =
    "http://www.w3.org/2001/sw/DataAccess/tests/test-manifest#result";
  const SOURCE = "http://www.w3.org/ns/sparql-service-description#endpoint";
  const SPEX = "https://purl.expasy.org/sparql-examples/ontology#";

  // parse input query string using SPARQLjs
  const serviceSources = parseSparqlQuery(query);

  // Saves RDF data as queries.ttl
  let dataset: SolidDataset, message: string;
  try {
    // Try to retrieve the dataset (container) and save updated dataset
    dataset = await getSolidDataset(containerUrl + fileName, { fetch: authFetch });
    message = `UPDATED queries.ttl which now includes: ${hash}`;
  } catch (error) {
    return `No queries.ttl file found at ${containerUrl}. Please create one to save query results to Cache.`;
  }

  // Create the RDF List of sources
  const { head: sourceListHead, nodes: sourceListNodes } =
    buildRdfList(sources);

  // Create a Thing for the new query cache
  const subjectUri = `${containerUrl + fileName}#${hash}`;
  let newQueryThing: Thing = createThing({ url: subjectUri });
  newQueryThing = buildThing(newQueryThing)
    // Specify the query hash.
    .addUrl(`${TYPE}`, `${QUERYsuperclass}`)
    .addUrl(`${TYPE}`, `${QUERYSELsubclass}`)
    .addIri(`${TYPE}`, `${sh}SPARQLExecutable`)
    // Add the query file
    .addUrl(`${QUERYprop}`, `${containerUrl}${queryFile}`)
    // add sh:prefixes
    // .addIri(`${sh}prefixes}`, prefixes[0])
    // add query body
    // TODO: fix this so the query is enclosed in """ """ not " " ...
    .addStringNoLocale(`${sh}select`, query)
    // Add the results file name
    .addUrl(`${RESULT}`, `${containerUrl}${queryResult}`)
    // Add sources as an RDF list
    .addIri(`${SOURCE}`, sourceListHead.url)

    // Add date of query execution.
    .addDatetime(`${CREATED}`, new Date())
    .build();

  // Adds any SERVICE description sources to query entry
  if (serviceSources.length > 0) {
    serviceSources.forEach((source) => {
      newQueryThing = buildThing(newQueryThing)
        .addUrl(`${SPEX}federatesWith`, source)
        .build();
    });
  }

  // Adds query sources to query entry
  dataset = setThing(dataset, newQueryThing);
  sourceListNodes.forEach((node) => {
    dataset = setThing(dataset, node);
  });
  await saveSolidDatasetAt(containerUrl + fileName, dataset, { fetch: authFetch });
  console.log(message);
  return hash;
}

/**
 * Creates and uploads a SPARQL query file (e.g., hash1.rq) into the container.
 *
 * The provided query string should be formatted as in the example:
 *
 *     PREFIX foaf: <http://xmlns.com/foaf/0.1/>
 *     PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
 *     SELECT ?name ?email
 *     WHERE {
 *         ?person rdf:type foaf:Person.
 *         ?person foaf:name ?name.
 *         OPTIONAL { ?person foaf:mbox ?email. }
 *     }
 *
 * @param containerUrl - The container URL (should end with a slash).
 * @param query - The SPARQL query as a string.
 * @param hashName - The hash name to use to name file (e.g., "hash1").
 * @returns The URL of the uploaded file.
 */
export async function uploadQueryFile(
  containerUrl: string,
  query: string,
  hashName: string
): Promise<string> {
  const fileName = hashName + ".rq";
  const blob = new Blob([query], { type: "application/sparql-query" });

  try {
    const savedFile = await saveFileInContainer(containerUrl, blob, {
      slug: fileName,
      contentType: "application/sparql-query",
      fetch: authFetch,
    });
    console.log(
      `Uploaded ${fileName} to ${savedFile.internal_resourceInfo.sourceIri}`
    );
    return savedFile.internal_resourceInfo.sourceIri;
  } catch (error) {
    console.error(`Error uploading ${fileName}:`, error);
    throw error;
  }
}

/**
 * Parses a SPARQL query file for SERVICE clauses and returns any federation source URLs.
 *
 * @param queryString The SPARQL query as a string.
 * @returns An object containing the prefixes and the query body.
 */
export function parseSparqlQuery(queryString: string): string[] {
  const parser = new SparqlParser();

  try {
    // Parse the SPARQL query string into a structured object
    const parsedQuery = parser.parse(queryString);

    // Initialize an array to store service sources
    const serviceSources: string[] = [];

    // Helper function to recursively search for SERVICE clauses
    function findServiceClauses(pattern: any) {
      if (pattern.type === "service" || pattern.type === "SERVICE") {
        // Add the service source (URL) to the array
        serviceSources.push(pattern.name.value);
      } else if (pattern.type === "group" || pattern.type === "union") {
        // Recursively check patterns in groups or unions
        pattern.patterns.forEach(findServiceClauses);
      } else if (pattern.type === "optional") {
        // Recursively check optional patterns
        findServiceClauses(pattern.pattern);
      }
    }

    // Start searching for SERVICE clauses in the query's WHERE clause
    if (parsedQuery.type === "query" && parsedQuery.where) {
      parsedQuery.where.forEach(findServiceClauses);
    }

    return serviceSources;
  } catch (error) {
    console.error("Error parsing SPARQL query for SERVICE clauses:", error);
    return [];
  }
}

export async function bindingsStreamToSparqlJson(queryResult: IQueryOperationResultBindings): Promise<any> {
  const vars = queryResult.variables.map(v => v.value);
  const bindings: any[] = [];
  for await (const binding of queryResult.bindingsStream) {
    const row: any = {};
    for (const [key, value] of binding) {
      row[key] = {
        type: value.termType === "Literal" ? "literal" : "uri",
        value: value.value,
      };
      if ('language' in value && value.language) {
        row[key]["xml:lang"] = value.language;
      }
      if ('datatype' in value && value.datatype && value.datatype.value !== "http://www.w3.org/2001/XMLSchema#string") {
        row[key].datatype = value.datatype.value;
      }
    }
    bindings.push(row);
  }
  return {
    head: { vars },
    results: { bindings }
  };
}

/**
 * Creates and uploads a JSON file (e.g., hash1.sparqljson) into the container.
 *
 * The input should be a JSON string formatted like:
 *
 * {
 *   "head": { "vars": ["name", "email"] },
 *   "results": {
 *     "bindings": [
 *       {
 *         "name": {"type": "literal", "value": "Alice"},
 *         "email": {"type": "literal", "value": "alice@example.org"}
 *       },
 *       { ... }
 *     ]
 *   }
 * }
 *
 * @param containerUrl - The container URL (should end with a slash).
 * @param jsonString - The JSON string to upload.
 * @param hashName - The hash name to use to name file (e.g., "hash1").
 * @returns The URL of the uploaded file.
 */
export async function uploadResults(
  containerUrl: string,
  jsonString: string,
  hashName: string
): Promise<string> {
  const fileName = hashName + ".json";
  const blob = new Blob([jsonString], {
    type: "application/sparql-results+json",
  });

  try {
    const savedFile = await saveFileInContainer(containerUrl, blob, {
      slug: fileName,
      contentType: "application/json",
      fetch: authFetch,
    });
    console.log(
      `Uploaded ${fileName} to ${savedFile.internal_resourceInfo.sourceIri}`
    );
    return savedFile.internal_resourceInfo.sourceIri;
  } catch (error) {
    console.error(`Error uploading ${fileName}:`, error);
    throw error;
  }
}
