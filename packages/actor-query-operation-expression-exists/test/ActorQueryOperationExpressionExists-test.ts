import {ActorQueryOperationExpression} from "@comunica/bus-query-operation-expression";
import {Bus} from "@comunica/core";
import {ActorQueryOperationExpressionExists} from "../lib/ActorQueryOperationExpressionExists";

describe('ActorQueryOperationExpressionExists', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationExpressionExists module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationExpressionExists).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationExpressionExists constructor', () => {
      expect(new (<any> ActorQueryOperationExpressionExists)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationExpressionExists);
      expect(new (<any> ActorQueryOperationExpressionExists)({ name: 'actor', bus })).toBeInstanceOf(ActorQueryOperationExpression);
    });

    it('should not be able to create new ActorQueryOperationExpressionExists objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationExpressionExists)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationExpressionExists instance', () => {
    let actor: ActorQueryOperationExpressionExists;

    beforeEach(() => {
      actor = new ActorQueryOperationExpressionExists({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
