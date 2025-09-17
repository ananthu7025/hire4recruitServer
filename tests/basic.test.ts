describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic JavaScript operations', () => {
    const testObject = { name: 'test', value: 42 };
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });

  it('should test async operations', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });
});