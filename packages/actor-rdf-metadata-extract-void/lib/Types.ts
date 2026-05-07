/**
 * Represents a VoID property partition containing statistics about a specific predicate.
 */
export interface IVoidPropertyPartition {
  /** The number of triples with this property. */
  triples: number | undefined;
  /** The number of distinct subjects for this property. */
  distinctSubjects: number | undefined;
  /** The number of distinct objects for this property. */
  distinctObjects: number | undefined;
}

/**
 * Represents a VoID class partition containing statistics about a specific class.
 */
export interface IVoidClassPartition {
  /** The number of entities belonging to this class. */
  entities: number | undefined;
  /** Property partitions within this class partition, keyed by property URI. */
  propertyPartitions: Record<string, IVoidPropertyPartition> | undefined;
}

/**
 * Represents a VoID dataset description with associated statistics and partitions.
 */
export interface IVoidDataset {
  /** The total number of distinct classes in the dataset. */
  classes: number | undefined;
  /** Class partitions within the dataset, keyed by class URI. */
  classPartitions: Record<string, IVoidClassPartition> | undefined;
  /** The number of distinct objects in the dataset. */
  distinctObjects: number | undefined;
  /** The number of distinct subjects in the dataset. */
  distinctSubjects: number | undefined;
  /** The number of distinct entities in the dataset. */
  entities: number | undefined;
  /** The URI identifier of the dataset. */
  identifier: string;
  /** Property partitions within the dataset, keyed by property URI. */
  propertyPartitions: Record<string, IVoidPropertyPartition> | undefined;
  /** The total number of triples in the dataset. */
  triples: number;
  /** A regular expression matching URIs that belong to this dataset. */
  uriRegexPattern: RegExp | undefined;
  /** The vocabularies used in the dataset. */
  vocabularies: string[] | undefined;
}
