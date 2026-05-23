# 📑 Engineering Reflection & Trade-offs

This document outlines the engineering decisions, trade-offs, limitations, and potential areas of improvement for the JWT & RBAC API test automation framework.

---

## 1. What Worked Well

- **Playwright Test for API Verification:** Leveraging Playwright's built-in `APIRequestContext` allowed us to write fast, browser-less integration tests. Unlike UI testing, the HTTP execution is lightning fast, taking milliseconds per test.
- **Direct Database State Verification (MongoDB Node.js Driver):** Rather than blindly trusting the HTTP response status codes and body content (which can sometimes be mocked or return false-positive success messages), the framework connects directly to the MongoDB instance. This enables us to prove that a resource was actually created, updated, or removed from the physical storage layer.
- **Dockerized Environment Orchestration:** Running the REST API and the MongoDB server in containerized services via Docker Compose ensures the entire test suite is completely portable and reproducible. Anyone with Docker installed can spin up the environment and run the test suite with a single command, mitigating "it works on my machine" issues.
- **Warm Authentication (Token Cache):** Implementing a centralized `auth-manager.ts` helper that caches tokens per role prevents redundant login requests. Rather than calling `/signin` before every single role-restricted test, the tokens are retrieved once and reused, maximizing test speed.

---

## 2. Design Decisions & Rationale

### Why TypeScript?
TypeScript was chosen to implement type safety and robust IDE autocomplete support across the testing layer. Defining explicit types for the user roles, request payloads, and API endpoints reduces human error and enforces clear schemas for test data, resulting in a cleaner and more maintainable test suite.

### Why Direct Database Access?
Validating only the HTTP response represents a "black-box" approach that misses data-layer defects. By using the official `mongodb` driver directly inside our tests, we achieve a "gray-box" testing standard:
1. We verify that a `DELETE` call actually removes the record (rather than simply marking it as inactive or having the delete statement fail silently).
2. We verify that database entries contain exact expected values (such as defaults or timestamps) that might not be exposed in the public HTTP responses.

### Why Project-Based Test Organization?
By structuring Playwright projects in a dependency chain (`auth` -> `rbac`/`tutorials` -> `e2e`), we establish a logical pipeline. We guarantee that fundamental behaviors (such as user creation and login) function correctly before we proceed to authorization boundaries, CRUD operations, and multi-step user workflows. If the authentication step fails, dependent projects are skipped, saving test run-time and narrowing down failure diagnostics.

---

## 3. Trade-offs

### Test Speed vs. Test Isolation
- **The Trade-off:** Running tests in parallel speeds up execution but introduces severe data collision issues, especially when tests modify shared collections (e.g., tutorial CRUD operations).
- **Our Approach:** We utilized `test.describe.serial` for dependency-heavy suites (such as the E2E user journey) and configured the Playwright config to run with a single worker (`workers: 1`). While this slightly extends test duration, it guarantees deterministic results, prevents database deadlocks, and eliminates flaky test runs.

### Seed via API vs. Direct DB Insert in Setup
- **The Trade-off:** Seeding user data directly into MongoDB is very fast, but bypasses the application's business logic (specifically, password hashing using `bcryptjs`).
- **Our Approach:** In `global-setup.ts`, we first seed static data (roles, sample tutorials) directly into the MongoDB instance to clean and normalize the database. However, to guarantee that login tests succeed and passwords are encrypted correctly, we register the test users by hitting the actual `POST /api/auth/signup` API endpoint. This provides a hybrid approach that is both highly robust and performance-oriented.

---

## 4. Current Limitations

- **No WebSocket / Real-time Event Testing:** The current API is purely REST-based. If real-time notifications or event-driven sockets are introduced, the framework will need additional helper libraries to handle persistent connections.
- **No Rate Limiting / DDoS Protection Testing:** The suite does not evaluate how the system handles rapid, repeated requests or brute-force attempts on auth endpoints.
- **No Concurrent User Simulation:** Since tests run sequentially, we do not evaluate the system's behavior under high concurrent write loads (e.g., two users attempting to update the same tutorial simultaneously).

---

## 5. Risks and Edge Cases Not Covered

- **Token Expiration Transitions:** The suite tests valid and expired tokens, but does not simulate the precise boundary window where a token expires *mid-operation* or during a long-running multi-request transaction.
- **Network Latency and Timeout Resiliency:** Tests run in a local network (Docker bridge). Under real production conditions, slow connections, packet drops, or slow DB responses might cause timeouts and flaky test failures.
- **Large Payload / Input Boundary Abuse:** We validate missing fields and invalid types, but do not test boundary limits like excessively large title strings (e.g., SQL injection vectors or multi-megabyte text inputs).

---

## 6. Future Production-Grade Enhancements

- **CI/CD Integration Pipeline:** Configure GitHub Actions, GitLab CI, or Jenkins pipelines to pull the repository, run `npm run ci`, and upload the Playwright HTML test report as a build artifact.
- **API Contract Verification:** Integrate contract testing tools (like Pact) to ensure changes in the backend API do not break frontend expectations or integration boundaries.
- **Performance & Load Testing:** Set up load-testing tools (such as k6 or Artillery) to simulate concurrent traffic spikes on the signup/login flow and CRUD endpoints.
- **Security Scanning & SAST/DAST:** Introduce automatic security scanners (such as OWASP ZAP or npm audit) into the pipeline to check for vulnerable dependencies and typical web vulnerabilities.
