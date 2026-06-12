# CodeSense AI 🔍✨

An AI-powered code analysis tool that takes any code snippet and instantly generates **documentation**, a **refactored production-quality version**, and **unit tests** — all in a clean, dark-themed web UI with a built-in Monaco code editor.

![CI](https://github.com/narensasbi-debuge/codesense-ai/actions/workflows/ci.yml/badge.svg)

**🌐 Live Demo: [codesense-ai-pi.vercel.app](https://codesense-ai-pi.vercel.app/)**

## ✨ Features

- **AI Code Analysis** — Paste any code snippet and get three deliverables in one click:
  - 📄 **Documentation** — clear explanation of what the code does, its parameters, return values, and side effects
  - 🔧 **Refactored Code** — an improved, production-quality version following language best practices
  - 🧪 **Unit Tests** — meaningful tests covering happy paths, edge cases, and error scenarios
- **16 Supported Languages** — JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby, C++, C, Swift, Kotlin, SQL, HTML, CSS
- **Monaco Editor** — the same editor that powers VS Code, with full syntax highlighting for both input and results
- **Tabbed Results Viewer** — switch between Documentation / Refactored Code / Unit Tests, with one-click copy to clipboard
- **Robust Validation** — every request and every LLM response is validated with Zod schemas (double-validated server-side before reaching the client)
- **Prompt-Injection Guardrails** — the system prompt treats submitted code strictly as data, never as instructions
- **Graceful Error Handling** — friendly messages for timeouts, rate limits, auth failures, and malformed LLM responses
- **Provider-Agnostic LLM Client** — works with any OpenAI-compatible API via environment configuration

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Code Editor | [Monaco Editor](https://github.com/suren-atoyan/monaco-react) (`@monaco-editor/react`) |
| Icons | [Lucide React](https://lucide.dev/) |
| Validation | [Zod 4](https://zod.dev/) |
| LLM Client | [OpenAI SDK](https://github.com/openai/openai-node) (any OpenAI-compatible provider) |
| Testing | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) + jsdom |
| Linting | [ESLint 9](https://eslint.org/) with `eslint-config-next` |
| CI/CD | [GitHub Actions](https://github.com/features/actions) (lint + tests on every push/PR) |

## 🏗️ How It Works

```
┌──────────────┐     POST /api/analyze      ┌──────────────────┐
│  Browser UI  │ ─────────────────────────▶ │  Next.js API     │
│  (Monaco     │   { code, language }       │  Route Handler   │
│   Editor)    │                            └────────┬─────────┘
└──────────────┘                                     │ Zod-validated request
       ▲                                             ▼
       │                                    ┌──────────────────┐
       │   { documentation,                 │  LLM Service     │
       │     refactored_code,  ◀─────────── │  (OpenAI-        │
       │     unit_tests }                   │   compatible)    │
       │   Zod-validated response           └──────────────────┘
```

1. The user pastes code into the Monaco editor and picks a language.
2. The client sends it to `POST /api/analyze`, where the request body is validated with Zod (max 50,000 characters).
3. The server calls the configured LLM with a strict JSON-only system prompt (`temperature: 0.3`, `response_format: json_object`, 60s timeout).
4. The LLM response is parsed and validated against a strict Zod schema — twice — before being returned.
5. Results render in a tabbed viewer with syntax highlighting and copy-to-clipboard.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- An API key for any OpenAI-compatible LLM provider

### Installation

```bash
# Clone the repository
git clone https://github.com/narensasbi-debuge/codesense-ai.git
cd codesense-ai

# Install dependencies
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```bash
# Required — API key for your LLM provider
LLM_API_KEY=your-api-key-here

# Required — model identifier for your LLM provider
LLM_MODEL_NAME=your-model-name

# Optional — custom base URL (defaults to https://api.openai.com/v1)
LLM_BASE_URL=https://your-provider.example.com/v1
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste some code, pick a language, and hit **Analyze Code**.

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest test suite |
| `npm run test:ui` | Run tests with the Vitest UI |

## 🔌 API Reference

### `POST /api/analyze`

**Request body**

```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript"
}
```

| Field | Type | Constraints |
|---|---|---|
| `code` | string | 1 – 50,000 characters |
| `language` | string | 1 – 50 characters |

**Success response** — `200 OK`

```json
{
  "documentation": "…",
  "refactored_code": "…",
  "unit_tests": "…"
}
```

**Error responses**

| Status | Meaning |
|---|---|
| `400` | Invalid JSON or failed request validation |
| `500` | LLM call failed or response failed schema validation |

## 📂 Project Structure

```
src/
├── app/
│   ├── api/analyze/route.ts   # API route — validates requests, calls the LLM
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main UI — editor, language selector, results
├── components/
│   ├── CodeEditor.tsx         # Monaco-based code input editor
│   └── ResultsViewer.tsx      # Tabbed results with syntax highlighting & copy
├── lib/
│   ├── llm.ts                 # OpenAI-compatible LLM client & error handling
│   ├── schemas.ts             # Zod schemas for requests & LLM responses
│   ├── utils.ts               # Shared utilities
│   └── __tests__/             # Unit tests
└── test/setup.ts              # Vitest setup
```

## 🧪 Testing & CI

Tests are written with **Vitest** and **Testing Library** in a jsdom environment:

```bash
npm run test
```

Every push and pull request to `main` runs linting and the full test suite via [GitHub Actions](.github/workflows/ci.yml).

## 📄 License

This project is private and not currently licensed for distribution.
