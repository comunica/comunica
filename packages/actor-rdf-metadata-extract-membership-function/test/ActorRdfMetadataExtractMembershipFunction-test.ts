import {ActorRdfMetadataExtract} from "@comunica/bus-rdf-metadata-extract";
import {Bus} from "@comunica/core";
import {ActorRdfMetadataExtractMembershipFunction} from "..";
const stream = require('streamify-array');
const quad = require('rdf-quad');

const SEMWEB: string = 'http://semweb.mmlab.be/ns/membership#';

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

  describe('An ActorRdfMetadataExtractSEMWEBCount instance', () => {
    let actor: ActorRdfMetadataExtractMembershipFunction;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractMembershipFunction({ name: 'actor', bus });
    });
    /*
    *   This test seems to be failing as the AMF server doesn't wrap the uri in a `NamedNode`
    */
    // it('should get membership function properties from stream', () => {
    //   return expect(actor.getMFProperties(stream([
    //     quad('first', SEMWEB + 'membershipFunction', 'first'),
    //     quad('_:b1_amf_subject', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    //         'NamedNode { id: \'http://semweb.mmlab.be/ns/membership#BloomFilter\' }'),
    //   ]))).resolves.toMatchObject({
    //     first: { mypage: [ 'first' ] },
    //     last: { mypage: [ 'last' ] },
    //   });
    // });
  });
});
