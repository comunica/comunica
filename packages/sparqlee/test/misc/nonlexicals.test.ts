describe.skip('non-lexical', () => {
  // TODO Most of the operators (and other functions) should fail when
  // non lexical literals are given
  it('thing', () => {
    expect(1 + 1).toBe(2);
  });
});
