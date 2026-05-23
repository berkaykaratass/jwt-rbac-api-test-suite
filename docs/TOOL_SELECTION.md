# 🛠️ Tool Selection & Justification

This document justifies the choices behind the tech stack selected for the automated testing framework of the JWT & RBAC-based REST API.

---

## 1. Primary Testing Framework: Playwright Test

Playwright Test was chosen as the test runner and HTTP client over traditional solutions. It is designed to handle modern, asynchronous web testing out-of-the-box.

### Key Capabilities Utilized:
- **Built-in `APIRequestContext`:** Playwright has native support for API requests. No extra libraries (like Axios or Supertest) are needed to make network calls, fetch responses, and perform assertions.
- **Worker Pools & Isolated Contexts:** Playwright manages test files using workers. It provides complete isolation between test files while allowing configurable concurrency, preventing cross-test data interference.
- **Global Setup & Teardown Lifecycle Hooks:** The framework uses Playwright's `globalSetup` and `globalTeardown` configurations to run the DB seeding, wait for the container network to be healthy, register test users, and tear down DB connections at the very end of the execution.
- **HTML Reporter:** Playwright generates comprehensive reports out-of-the-box, providing trace info, logs, and a clean UI for debugging failed tests.

### Comparison Matrix:

| Feature / Criteria | Playwright Test (Selected) | Jest + Supertest | Mocha + Chai + Axios |
| :--- | :--- | :--- | :--- |
| **Language Support** | TypeScript Native | JS/TS (Requires Babel/ts-jest) | JS/TS (Requires compilation setup) |
| **API Client** | Built-in (`APIRequestContext`) | Requires `supertest` | Requires `axios` / `superagent` |
| **Reporter** | Rich HTML & JSON out-of-the-box | Basic console (needs HTML plugins) | Basic console (needs HTML plugins) |
| **Global Hooks** | Highly robust, supports setup dependencies | Harder to pass states cleanly | Basic setup hooks |
| **Speed/Concurrency**| Excellent (Node-native workers) | Good (Worker pool) | Slower (Process-level parallelization) |
| **UI Testing Path** | Unmatched (Unified API & UI testing) | Basic (Needs JSDOM or Puppeteer) | Basic (Needs Selenium or Cypress) |

---

## 2. Database Verification: MongoDB Node.js Driver

For DB verification, the official `mongodb` npm driver was selected rather than using Mongoose or another ODM inside the test framework.

### Rationale:
- **No ORM Overhead:** Tests do not require database modeling, schema lifecycle hooks, or validation layers. We only need to check raw documents inside the collection to verify the API's mutations.
- **Direct Database Access:** Using the native driver lets us issue raw queries (like `findOne` and `countDocuments`) directly, mirroring the exact, low-level state of the database.
- **Independence:** Decoupling the testing assertions from Mongoose schemas ensures that if Mongoose configuration errors occur on the backend (e.g. strict schema bypasses), our tests will still catch the actual data anomalies.

---

## 3. Programming Language: TypeScript

TypeScript is the industry standard for modern enterprise test automation.

### Rationale:
- **Strict Typing:** Avoids typos in API path parameters, request bodies, and expected messages.
- **Self-Documenting Code:** Clean type contracts (such as `UserRole` and `SIGNUP_DATA`) explain to any new QA engineer exactly what inputs are valid and what properties to expect.
- **IDE Support:** Provides auto-imports, real-time error highlighting, and inline parameter documentation, greatly reducing development time.

---

## 4. Environment Containerization: Docker Compose

Docker Compose acts as the orchestration layer for the entire project.

### Rationale:
- **Identical Environments:** Guarantees that the MongoDB database and backend Node.js API run in the exact same configuration on every developer machine or CI agent.
- **Health Checks:** Using Docker Compose's `depends_on` condition `service_healthy`, we prevent tests from executing until the MongoDB database has completed initial startup and the Express server is fully ready to accept incoming API calls.
- **Clean Isolation:** The databases, network bridges, and file mounts are fully isolated and can be destroyed with a single command (`npm run docker:down`), ensuring no dirty databases or hanging processes are left on the host system.
