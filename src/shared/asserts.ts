export const assertions = {
  numbers: {
    /** Returns `true` if value is a valid number (not NaN). */
    assertNumber(value: unknown): value is number {
      return typeof value === "number" && !Number.isNaN(value);
    },

    /** Returns `true` if value is an integer. */
    assertInteger(value: unknown): value is number {
      return typeof value === "number" && Number.isInteger(value);
    },

    /** Returns `true` if value is a number greater than 0. */
    assertPositive(value: unknown): value is number {
      return typeof value === "number" && value > 0;
    },

    /** Returns `true` if value is a number greater than or equal to 0. */
    assertNonNegative(value: unknown): value is number {
      return typeof value === "number" && value >= 0;
    },

    /** Returns `true` if value is a number less than 0. */
    assertNegative(value: unknown): value is number {
      return typeof value === "number" && value < 0;
    },

    /** Returns `true` if value is a number within [min, max] (inclusive). */
    assertInRange(value: unknown, min: number, max: number): value is number {
      return typeof value === "number" && value >= min && value <= max;
    },

    /** Returns `true` if value is a finite number (not NaN, not Infinity). */
    assertFinite(value: unknown): value is number {
      return typeof value === "number" && Number.isFinite(value);
    },
  },

  strings: {
    /** Returns `true` if value is a string. */
    assertString(value: unknown): value is string {
      return typeof value === "string";
    },

    /** Returns `true` if value is a non-empty string. */
    assertNonEmpty(value: unknown): value is string {
      return typeof value === "string" && value.length > 0;
    },

    /** Returns `true` if value is a string with at least `min` characters. */
    assertMinLength(value: unknown, min: number): value is string {
      return typeof value === "string" && value.length >= min;
    },

    /** Returns `true` if value is a string with at most `max` characters. */
    assertMaxLength(value: unknown, max: number): value is string {
      return typeof value === "string" && value.length <= max;
    },

    /** Returns `true` if value is a string matching the given regex pattern. */
    assertMatches(value: unknown, pattern: RegExp): value is string {
      return typeof value === "string" && pattern.test(value);
    },
  },

  arrays: {
    /** Returns `true` if value is an array. */
    assertArray(value: unknown): value is unknown[] {
      return Array.isArray(value);
    },

    /** Returns `true` if value is a non-empty array. */
    assertNonEmpty(value: unknown): value is [unknown, ...unknown[]] {
      return Array.isArray(value) && value.length > 0;
    },

    /**
     * Returns `true` if value is an array where every element passes the
     * type guard function.
     */
    assertArrayOf<T>(
      value: unknown,
      guard: (x: unknown) => x is T,
    ): value is T[] {
      return Array.isArray(value) && value.every(guard);
    },

    /**
     * Returns `true` if value is an array where every element is an
     * instance of the given constructor (uses `instanceof`).
     */
    assertInstanceOf<T>(
      value: unknown,
      ctor: new (...args: any[]) => T,
    ): value is T[] {
      return Array.isArray(value) && value.every((x) => x instanceof ctor);
    },
  },

  dates: {
    /** Returns `true` if value is a valid Date instance (not "Invalid Date"). */
    assertDate(value: unknown): value is Date {
      return value instanceof Date && !Number.isNaN(value.getTime());
    },

    /** Returns `true` if value is a Date that is not in the future (≤ now). */
    assertNonFuture(value: unknown): value is Date {
      return value instanceof Date && value.getTime() <= Date.now();
    },
  },

  /** Returns `true` if value is not null or undefined. */
  assertDefined<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
  },
};
