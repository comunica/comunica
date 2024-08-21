import type * as RDF from '@rdfjs/types';

export type ComunicaDataFactory = RDF.DataFactory & { variable: (value: string) => RDF.Variable };
