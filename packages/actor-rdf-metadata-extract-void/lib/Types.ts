export interface IVoidPropertyPartition {
  triples: number | undefined;
  distinctSubjects: number | undefined;
  distinctObjects: number | undefined;
}

export interface IVoidClassPartition {
  entities: number | undefined;
  propertyPartitions: Record<string, IVoidPropertyPartition> | undefined;
}

export interface IVoidDataset {
  classes: number | undefined;
  classPartitions: Record<string, IVoidClassPartition> | undefined;
  distinctObjects: number | undefined;
  distinctSubjects: number | undefined;
  entities: number | undefined;
  identifier: string;
  propertyPartitions: Record<string, IVoidPropertyPartition> | undefined;
  triples: number;
  uriRegexPattern: RegExp | undefined;
  vocabularies: string[] | undefined;
}
