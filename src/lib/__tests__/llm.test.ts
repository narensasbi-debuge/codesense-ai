// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mock classes and function before vi.mock factory
// (vi.mock is hoisted to the top, so everything it references must also be
// hoisted via vi.hoisted)
// ---------------------------------------------------------------------------

const { mockCreate, MockAPIConnectionError, MockAPIConnectionTimeoutError, MockAuthenticationError, MockRateLimitError } = vi.hoisted(() => {
  // Mock error classes that mirror OpenAI's static error hierarchy
  // so instanceof checks in llm.ts resolve correctly.
  class MockAPIConnectionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "APIConnectionError";
    }
  }

  class MockAPIConnectionTimeoutError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "APIConnectionTimeoutError";
    }
  }

  class MockAuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthenticationError";
    }
  }

  class MockRateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "RateLimitError";
    }
  }

  return {
    mockCreate: vi.fn(),
    MockAPIConnectionError,
    MockAPIConnectionTimeoutError,
    MockAuthenticationError,
    MockRateLimitError,
  };
});

// ---------------------------------------------------------------------------
// Mock the openai module
// ---------------------------------------------------------------------------

vi.mock("openai", () => {
  // Use a plain function as a constructor — `new OpenAI()` in llm.ts
  // will invoke this and receive the client object.
  function MockOpenAI(_opts?: Record<string, unknown>) {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }

  // Attach error classes as static properties so `error instanceof OpenAI.XXX` works
  MockOpenAI.APIConnectionError = MockAPIConnectionError;
  MockOpenAI.APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
  MockOpenAI.AuthenticationError = MockAuthenticationError;
  MockOpenAI.RateLimitError = MockRateLimitError;

  return { default: MockOpenAI };
});

// Import after mocks are set up
import { analyzeCode } from "../llm";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_RESULT = {
  documentation:
    "This function calculates the nth Fibonacci number using recursion.",
  refactored_code:
    "function fibonacci(n: number): number {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}",
  unit_tests:
    "import { describe, it, expect } from 'vitest';\ndescribe('fibonacci', () => {\n  it('returns 0 for n=0', () => { expect(fibonacci(0)).toBe(0); });\n});",
};

const SAMPLE_CODE = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

/** Helper to build a valid OpenAI chat completion response */
function makeCompletion(content: string) {
  return {
    choices: [{ message: { content, role: "assistant" as const } }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("analyzeCode", () => {
  // Set required env var for the client constructor
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      LLM_API_KEY: "test-key",
      LLM_MODEL_NAME: "test-model",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // -------------------------------------------------------------------------
  // Success case
  // -------------------------------------------------------------------------
  describe("success case", () => {
    it("returns a validated AnalyzeResult when the LLM returns valid JSON", async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(VALID_RESULT)));

      const result = await analyzeCode(SAMPLE_CODE, "typescript");

      expect(result).toEqual(VALID_RESULT);
      expect(mockCreate).toHaveBeenCalledOnce();
      // Verify the API was called with correct structure
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("test-model");
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe("system");
      expect(callArgs.messages[1].role).toBe("user");
      expect(callArgs.messages[1].content).toContain(SAMPLE_CODE);
      expect(callArgs.messages[1].content).toContain("typescript");
      expect(callArgs.response_format).toEqual({ type: "json_object" });
      expect(callArgs.temperature).toBe(0.3);
    });

    it("uses LLM_MODEL_NAME env var when set", async () => {
      process.env.LLM_MODEL_NAME = "custom-model";
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(VALID_RESULT)));

      await analyzeCode(SAMPLE_CODE, "typescript");

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("custom-model");
    });

    it("throws a descriptive error when LLM_MODEL_NAME is not set", async () => {
      delete process.env.LLM_MODEL_NAME;

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM_MODEL_NAME environment variable is not set/,
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edge case 1: Malformed / invalid LLM responses
  // -------------------------------------------------------------------------
  describe("malformed LLM responses", () => {
    it("throws a Zod validation error when a required field is missing", async () => {
      const incomplete = { documentation: "Some docs" }; // missing refactored_code, unit_tests
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(incomplete)));

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM response failed schema validation/,
      );
    });

    it("throws a Zod validation error when a field is an empty string", async () => {
      const emptyField = {
        documentation: "Docs here",
        refactored_code: "",
        unit_tests: "Tests here",
      };
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(emptyField)));

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM response failed schema validation/,
      );
    });

    it("throws when the LLM returns invalid JSON (not parseable)", async () => {
      mockCreate.mockResolvedValueOnce(
        makeCompletion("This is not JSON at all, just plain text."),
      );

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM response is not valid JSON/,
      );
    });

    it("throws when the LLM returns an empty response content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "", role: "assistant" } }],
      });

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM returned an empty response/,
      );
    });

    it("throws when the LLM returns null content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null, role: "assistant" } }],
      });

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM returned an empty response/,
      );
    });

    it("throws when choices array is empty", async () => {
      mockCreate.mockResolvedValueOnce({ choices: [] });

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM returned an empty response/,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Edge case 2: Network / API errors
  // -------------------------------------------------------------------------
  describe("network and API errors", () => {
    it("throws a sanitized message on API connection timeout", async () => {
      mockCreate.mockRejectedValueOnce(
        new MockAPIConnectionTimeoutError("Request timed out"),
      );

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /The LLM request timed out/,
      );
    });

    it("throws a sanitized message on API connection error", async () => {
      mockCreate.mockRejectedValueOnce(
        new MockAPIConnectionError("ECONNREFUSED"),
      );

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /Failed to connect to the LLM service/,
      );
    });

    it("throws a sanitized message on authentication error", async () => {
      mockCreate.mockRejectedValueOnce(
        new MockAuthenticationError("Invalid API key"),
      );

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM authentication failed/,
      );
    });

    it("throws a sanitized message on rate limit error", async () => {
      mockCreate.mockRejectedValueOnce(
        new MockRateLimitError("Rate limit exceeded"),
      );

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /Rate limit exceeded/,
      );
    });

    it("throws a generic message on an unexpected Error", async () => {
      mockCreate.mockRejectedValueOnce(new Error("Internal server error 500"));

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM request failed: Internal server error 500/,
      );
    });

    it("throws a generic message on a non-Error rejection", async () => {
      mockCreate.mockRejectedValueOnce("string error");

      await expect(analyzeCode(SAMPLE_CODE, "typescript")).rejects.toThrow(
        /LLM request failed: Unknown error/,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Edge case 3: Extreme input values
  // -------------------------------------------------------------------------
  describe("extreme input values", () => {
    it("handles an empty string as code input without crashing", async () => {
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(VALID_RESULT)));

      const result = await analyzeCode("", "typescript");

      expect(result).toEqual(VALID_RESULT);
      // Verify the empty code was passed through to the LLM
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[1].content).toContain("typescript");
    });

    it("handles an extremely long code string without crashing", async () => {
      const longCode = "x".repeat(100_000);
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(VALID_RESULT)));

      const result = await analyzeCode(longCode, "typescript");

      expect(result).toEqual(VALID_RESULT);
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it("handles a code snippet with special characters", async () => {
      const specialCode = `const msg = "Hello <world> & 'friends' \\n\\t"; // <script>alert('xss')</script>`;
      mockCreate.mockResolvedValueOnce(makeCompletion(JSON.stringify(VALID_RESULT)));

      const result = await analyzeCode(specialCode, "javascript");

      expect(result).toEqual(VALID_RESULT);
    });
  });
});