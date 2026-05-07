import type * as RDF from '@rdfjs/types';

/**
 * An RDF data factory extended with a variable factory method.
 */
export type ComunicaDataFactory = RDF.DataFactory & { variable: (value: string) => RDF.Variable };
