import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {OstrichQuadSource} from "./OstrichQuadSource";
// TODO: Create OSTRICH typings
const ostrich = require('ostrich-bindings'); // tslint:disable-line:no-var-requires

/**
 * A comunica OSTRICH RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternOstrich extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternOstrichArgs {

  public readonly ostrichFiles?: string[];
  public ostrichDocuments: {[file: string]: Promise<any>} = {};
  public closed: boolean = false;

  protected shouldClose: boolean;
  protected queries: number = 0;

  constructor(args: IActorRdfResolveQuadPatternOstrichArgs) {
    super(args);
  }

  public initializeOstrich(ostrichPath: string): Promise<any> {
    return this.ostrichDocuments[ostrichPath] = new Promise((resolve, reject) => {
      ostrich.fromPath(ostrichPath, (error: Error, ostrichStore: any) => {
        if (error) {
          return reject(error);
        }
        resolve(ostrichStore);
      });
    });
  }

  public async initialize(): Promise<any> {
    (this.ostrichFiles || []).forEach((ostrichFile) => this.initializeOstrich(ostrichFile));
    return null;
  }

  public async deinitialize(): Promise<any> {
    process.on('exit', () => this.safeClose());
    process.on('SIGINT', () => this.safeClose());
    return null;
  }

  public close() {
    if (this.closed) {
      throw new Error('This actor can only be closed once.');
    }
    if (!this.queries) {
      this.shouldClose = false;
      Object.keys(this.ostrichDocuments).forEach(
        async (ostrichFile) => (await this.ostrichDocuments[ostrichFile]).close());
      this.closed = true;
    } else {
      this.shouldClose = true;
    }
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
      || action.context.sources[0].type !== 'ostrichFile' || !action.context.sources[0].value) {
      throw new Error(this.name + ' requires a single source with a ostrichFile to be present in the context.');
    }
    if (action.pattern.graph.termType !== 'DefaultGraph') {
      throw new Error(this.name + ' can only perform versioned queries in the default graph.');
    }
    if (!action.context.version
      || (action.context.version.type !== 'version-materialization'
      && action.context.version.type !== 'delta-materialization'
      && action.context.version.type !== 'version-query')) {
      throw new Error(this.name + ' requires a version context.');
    }
    return true;
  }

  protected safeClose() {
    if (!this.closed) {
      this.close();
    }
  }

  protected async getSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    const ostrichFile: string = context.sources[0].value;
    if (!this.ostrichDocuments[ostrichFile]) {
      await this.initializeOstrich(ostrichFile);
    }
    return new OstrichQuadSource(await this.ostrichDocuments[ostrichFile]);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: {[id: string]: any})
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    this.queries++;
    (<OstrichQuadSource> source).setVersionContext(context.version);
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.data.on('end', () => {
      this.queries--;
      if (this.shouldClose) {
        this.close();
      }
    });
    output.metadata = () => new Promise((resolve, reject) => {
      output.data.on('error', reject);
      output.data.on('end', () => {
        reject(new Error('No count metadata was found'));
      });
      output.data.once('totalItems', (totalItems: number) => {
        resolve({ totalItems });
      });
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternOstrichArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The OSTRICH files to preload.
   */
  ostrichFiles?: string[];
}

export type VersionContext = IVersionContextVersionMaterialization | IVersionContextDm | IVersionContextVersionQuery;

/**
 * Context for a single version.
 */
export interface IVersionContextVersionMaterialization {
  type: 'version-materialization';
  version: number;
}

/**
 * Context for the delta between two versions.
 */
export interface IVersionContextDm {
  type: 'delta-materialization';
  versionStart: number;
  versionEnd: number;
}

/**
 * Context for all versions.
 */
export interface IVersionContextVersionQuery {
  type: 'version-query';
}
