 # AMF server
 De amf-server opzetten lijkt me achteraf gezien vrij straight forward. Nu heb ik last gehad van een vreemde situatie waarbij ik de amf-server-branch eerst geinstalleerd heb via npm, de packages heb geinstalleerd en daarna geen correct werkende server te hebben. Na lang zoeken heb ik beslist om het gewoon volledig opnieuw te installeren. Deze keer heb ik het (onbewust) via `git clone` gedaan, en bleek het te werken. Hoewel ik niet zie hoe de ene methode beter kan zijn dan de andere zou ik dus aanraden om het met git clone te installeren.

 Om te testen of de amf-specifieke metadata wel degelijk door kwam heb ik het volgend commando gebruikt:

 `curl -H "Accept: application/trig"
 "http://localhost:5000/dbpedia?subject=&predicate=http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23rest&object=genid%3Adbpedia%2FN27f9047cdb1949e295712733ecc77cbf"`

 Deze curl gaat exact een triple hebben als respons data. Een belangrijk aspect is dat deze triple maar een variabele heeft. Dit is essentieel om een Membership Function terug te krijgen.

De overeenkomstige comunica-query is:

`node packages/actor-init-sparql/bin/query-dynamic.js http://localhost:5000/dbpedia 'SELECT ?s WHERE {?s <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <genid:dbpedia/N27f9047cdb1949e295712733ecc77cbf>.}'
`

 # Metadata extractor

 Om deze data te gebruiken moet ze eerst als metadata bestempeld worden. Dit heb ik gedaan door in de `actor-rdf-metadata-triple-predicate` config files 'http://semweb.mmlab.be/ns/membership#' ook als een geldige url in te stellen. Daarnaast is er ook een actor nodig om de nodige metadata uit deze quads te extraheren. Dit wordt gedaan door `actor-rdf-metadata-extract-membership-function`.

 Omdat de quads er zo uitzagen:

 ```
 Quad {
  subject: ...,
  predicate: NamedNode { id: 'http://semweb.mmlab.be/ns/membership#membershipFilter' },
  object: BlankNode { id: '_:b1_amf_subject' },
  graph:
   ...
}
Quad {
  subject: BlankNode { id: '_:b1_amf_subject' },
  predicate: NamedNode { id: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' },
  object: NamedNode { id: 'http://semweb.mmlab.be/ns/membership#BloomFilter' },
  graph:
   ...
  }
```
moest ik dus eerst de binding met de membershipFilter opvangen ( `_:b1_amp_subject`) en daarna alle quads met overeenkomstig subject er zo uit vissen. Deze metadata moet voor de rest niet meer verwerkt worden.

Nu zit ik aan het punt waar ik vast zat: Het implementeren van de filter. Ik heb nog niet helemaal goed door welke route zo'n linked data stream volgt en vind het daarom moeilijk te bepalen waar ik begin. Daarnaast is het implementeren ook niet gemakkelijk.
