import {ActorRdfMetadataExtract, IActionRdfMetadataExtract,
    IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * A comunica Membership Function RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractMembershipFunction extends ActorRdfMetadataExtract {

  public static readonly SEMWEB: string = 'http://semweb.mmlab.be/ns/membership#';

  public constructor(args: IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public getMFProperties(metadata: RDF.Stream): Promise<{[property: string]: {[subject: string]: string[]}}> {
    return new Promise((resolve, reject) => {
      metadata.on('error', reject);

      // Collect all MF properties in a nice convenient nested hash (property / subject / objects).
      const MFProperties: {[property: string]: {[subject: string]: string[]}} = {};
      let MembershipFunctionBinding: string;
      metadata.on('data', (quad) => {
        if (quad.predicate.value.startsWith(ActorRdfMetadataExtractMembershipFunction.SEMWEB)) {
          if (quad.object.value.endsWith("amf_subject")) {
            MembershipFunctionBinding = quad.object.value;
          }
        }
        if (MembershipFunctionBinding !== undefined && quad.subject.value === MembershipFunctionBinding) {
          const property = quad.predicate.value.substr(ActorRdfMetadataExtractMembershipFunction.SEMWEB.length);
          const subjectProperties = MFProperties[property] || (MFProperties[property] = {});
          const objects = subjectProperties[quad.subject.value] || (subjectProperties[quad.subject.value] = []);
          objects.push(quad.object.value);        }
      });

      metadata.on('end', () => {
        resolve(MFProperties);
      });
    });
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const MFProperties = await this.getMFProperties(action.metadata);
    return { metadata: MFProperties };
  }
}
