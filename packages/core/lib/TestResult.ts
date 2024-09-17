/**
 * A test result represents the result of an actor test that can either be passed or failed.
 *
 * Test results are immutable.
 */
export type TestResult<T, TS = undefined> = TestResultPassed<T, TS> | TestResultFailed;

/**
 * Create a new test result that represents a passed value.
 * @param value The value the test passed with.
 */
export function passTest<T>(value: T): TestResultPassed<T, undefined> {
  return new TestResultPassed<T, undefined>(value, undefined);
}

/**
 * Create a new test result that represents a passed void value.
 */
export function passTestVoid(): TestResultPassed<any, undefined> {
  return new TestResultPassed<any, undefined>(true, undefined);
}

/**
 * Create a new test result that represents a passed value with side data.
 * @param value The value the test passed with.
 * @param sideData Additional data to pass to the run phase.
 */
export function passTestWithSideData<T, S>(value: T, sideData: S): TestResultPassed<T, S> {
  return new TestResultPassed<T, S>(value, sideData);
}

/**
 * Create a new test result that represents a passed void value with side data.
 * @param sideData Additional data to pass to the run phase.
 */
export function passTestVoidWithSideData<TS>(sideData: TS): TestResultPassed<any, TS> {
  return new TestResultPassed<any, TS>(true, sideData);
}

/**
 * Create a new test result that represents a test failure.
 * @param message The error message that describes the failure.
 */
export function failTest(message: string): TestResultFailed {
  return new TestResultFailed(message);
}

/**
 * A passed test result.
 * This should not be constructed manually.
 * Instead, `testPass` should be used.
 */
export class TestResultPassed<T, TS> {
  protected readonly value: T;
  protected readonly sideData: TS;

  public constructor(passValue: T, sideData: TS) {
    this.value = passValue;
    this.sideData = sideData;
  }

  /**
   * Check if the test has passed.
   * If true, it will contain a value.
   */
  public isPassed(): this is TestResultPassed<T, TS> {
    return true;
  }

  /**
   * Check if the test has failed.
   * If true, it will contain a failure message.
   */
  public isFailed(): this is TestResultFailed {
    return false;
  }

  /**
   * Get the value of the passed test, or undefined if the test failed.
   */
  public get(): T {
    return this.value;
  }

  /**
   * Get the value of the passed test, or throw an error if the test failed.
   */
  public getOrThrow(): T {
    return this.value;
  }

  /**
   * The side data that will be passed to run.
   */
  public getSideData(): TS {
    return this.sideData;
  }

  /**
   * Get the failure message callback of the failed test, or undefined if the test passed.
   */
  public getFailMessage(): undefined {
    return undefined;
  }

  /**
   * For passed tests, map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   *
   * @param mapper A function that will transform the passed value.
   */
  public map<T2>(mapper: (value: T, sideData: TS) => T2): TestResultPassed<T2, TS> {
    return new TestResultPassed<T2, TS>(mapper(this.value, this.sideData), this.sideData);
  }

  /**
   * For passed tests, asynchronously map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   *
   * @param mapper A function that will transform the passed value.
   */
  public async mapAsync<T2>(mapper: (value: T, sideData: TS) => Promise<T2>): Promise<TestResultPassed<T2, TS>> {
    return new TestResultPassed<T2, TS>(await mapper(this.value, this.sideData), this.sideData);
  }
}

/**
 * A failed test result.
 * This should not be constructed manually.
 * Instead, `testFail` should be used.
 */
export class TestResultFailed {
  protected readonly failMessage: string;

  public constructor(failMessage: string) {
    this.failMessage = failMessage;
  }

  /**
   * Check if the test has passed.
   * If true, it will contain a value.
   */
  public isPassed(): this is TestResultPassed<any, any> {
    return false;
  }

  /**
   * Check if the test has failed.
   * If true, it will contain a failure message.
   */
  public isFailed(): this is TestResultFailed {
    return true;
  }

  /**
   * Get the value of the passed test, or undefined if the test failed.
   */
  public get(): undefined {
    return undefined;
  }

  /**
   * Get the value of the passed test, or throw an error if the test failed.
   */
  public getOrThrow(): never {
    throw new Error(this.getFailMessage());
  }

  /**
   * The side data that will be passed to run.
   */
  public getSideData(): never {
    throw new Error(this.getFailMessage());
  }

  /**
   * Get the failure message callback of the failed test, or undefined if the test passed.
   */
  public getFailMessage(): string {
    return this.failMessage;
  }

  /**
   * For passed tests, map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   */
  public map(): TestResultFailed {
    return this;
  }

  /**
   * For passed tests, asynchronously map the passed value to another value.
   * Failed tests will remain unchanged.
   *
   * This will not mutate the test result, and instead return a new test result.
   */
  public async mapAsync(): Promise<TestResultFailed> {
    return this;
  }
}
