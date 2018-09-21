import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {ActorRdfMetadataExtractMembershipFunction} from "../lib/ActorRdfMetadataExtractMembershipFunction";

describe('ActorRdfMetadataExtractMembershipFunction', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfMetadataExtractMembershipFunction module', () => {
    it('should be a function', () => {
      expect(ActorRdfMetadataExtractMembershipFunction).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfMetadataExtractMembershipFunction constructor', () => {
      expect(new (<any> ActorRdfMetadataExtractMembershipFunction)({ name: 'actor', bus }))
          .toBeInstanceOf(ActorRdfMetadataExtractMembershipFunction);
      expect(new (<any> ActorRdfMetadataExtractMembershipFunction)({ name: 'actor', bus }))
          .toBeInstanceOf(ActorRdfMetadataExtract);
    });

    it('should not be able to create new ActorRdfMetadataExtractMembershipFunction objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfMetadataExtractMembershipFunction)(); }).toThrow();
    });
  });
});
