import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {HdtQuadSource} from "./HdtQuadSource";
// TODO: Create HDT typings
const hdt = require('hdt'); // tslint:disable-line:no-var-requires

/**
 * A comunica HDT RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternHdt extends ActorRdfResolveQuadPatternSource
 implements IActorRdfResolveQuadPatternHdtArgs {

  public readonly hdtFiles?: string[];
  public hdtDocuments: {[file: string]: Promise<any>} = {};
  public closed: boolean = false;

  protected shouldClose: boolean;
  protected queries: number = 0;

  constructor(args: IActorRdfResolveQuadPatternHdtArgs) {
    super(args);
  }

  public initializeHdt(hdtFile: string): Promise<void> {
    return this.hdtDocuments[hdtFile] = new Promise((resolve, reject) => {
      hdt.fromFile(hdtFile, (error: Error, hdtDocument: any) => {
        if (error) {
          return reject(error);
        }
        resolve(hdtDocument);
      });
    });
  }

  public async initialize(): Promise<any> {
    (this.hdtFiles || []).forEach((hdtFile) => this.initializeHdt(hdtFile));
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
      Object.keys(this.hdtDocuments).forEach(async (hdtFile) => (await this.hdtDocuments[hdtFile]).close());
      this.closed = true;
    } else {
      this.shouldClose = true;
    }
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
      || action.context.sources[0].type !== 'hdtFile' || !action.context.sources[0].value) {
      throw new Error(this.name + ' requires a single source with a hdtFile to be present in the context.');
    }
    return true;
  }

  protected safeClose() {
    if (!this.closed) {
      this.close();
    }
  }

  protected async getSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    const hdtFile: string = context.sources[0].value;
    if (!this.hdtDocuments[hdtFile]) {
      await this.initializeHdt(hdtFile);
    }
    return new HdtQuadSource(await this.hdtDocuments[hdtFile]);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: {[id: string]: any})
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    this.queries++;
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = new Promise((resolve, reject) => {
      output.data.on('error', reject);
      output.data.on('end', () => {
        this.queries--;
        if (this.shouldClose) {
          this.close();
        }
        reject(new Error('No count metadata was found'));
      });
      output.data.once('totalItems', (totalItems: number) => {
        resolve({ totalItems });
      });
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternHdtArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The HDT files to preload.
   */
  hdtFiles?: string[];
}
