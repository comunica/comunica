
describe('ActorInitSparql', () => {
  let testVariable;
  beforeEach(() => {
    testVariable = 10;
  });

  describe('A test describe', () => {
    const testVariable2 = 20;
    let testVariable3;
    beforeEach(() => {
      testVariable3 = 30;
    });

    it('should test', () => {
      expect(testVariable).toEqual(10);
      expect(testVariable2).toEqual(20);
      expect(testVariable3).toEqual(30);
    });
  });
});
