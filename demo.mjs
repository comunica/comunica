import { translate } from 'sparqlalgebrajs';

const query = translate(`
PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ruben: <http://example.org/ruben#>
PREFIX rubent: <http://example.org/rubent#>

SELECT ?interestName
WHERE {
  VALUES (?interestName) {
    ("Linked Data"@en)
  }
  
  ruben:me foaf:topic_interest ?interest .
  rubent:me foaf:topic_interest ?interest .
  ?interest rdfs:label ?interestName .
  
  FILTER LANGMATCHES(LANG(?interestName), "EN")
}

`);

console.log(JSON.stringify(query, null, 2));
