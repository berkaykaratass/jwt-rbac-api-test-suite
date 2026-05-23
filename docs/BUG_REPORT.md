# 🐛 Bug Report: Tutorial API Defects

This document details functional and architectural bugs identified in the System Under Test (SUT) during the implementation and execution of the automated test suite.

---

## Bug ID: BUG-001
### Title: Empty Request Body and Arbitrary Fields Permitted in Tutorial Updates (`PUT /api/tutorials/:id`)

- **Severity:** Medium
- **Priority:** High
- **Environment:** Docker container (`node:18-alpine`), Node.js 18.x, MongoDB 6.0, Mongoose 5.x
- **Component:** Tutorial Controller (`sut-config/tutorial.controller.js`) / Update Endpoint (`PUT /api/tutorials/:id`)

### Description
The tutorial update endpoint accepts updates with an empty request body (no fields supplied) and returns a success response (`200 OK` with `"Tutorial was updated successfully."`) even though no modifications were performed. Furthermore, the endpoint does not validate that incoming fields correspond to the Tutorial schema; it silently accepts and discards arbitrary request body parameters, or allows them to pollute the database context.

### Steps to Reproduce
1. Authenticate as a user to obtain a valid JWT token.
2. Create a tutorial using the `POST /api/tutorials` endpoint (e.g. ID: `60d5ec495400b925ac48e1f5`).
3. Send a `PUT /api/tutorials/60d5ec495400b925ac48e1f5` request with:
   - An empty body: `{}`
   - OR a body containing arbitrary, invalid parameters: `{"invalidField": "garbageValue", "anotherFakeField": 123}`
4. Observe the HTTP status code and response payload.

### Expected Result
- **For Empty Body:** The API should return `400 Bad Request` with an error message indicating that no update fields were supplied (e.g., `"Update fields cannot be empty!"`).
- **For Arbitrary/Invalid Fields:** The API should filter out invalid parameters or return `400 Bad Request` specifying that the fields provided are not valid Tutorial schema attributes.

### Actual Result
- The API returns a `200 OK` status and a success message: `{"message": "Tutorial was updated successfully."}`.
- For invalid/arbitrary fields, the controller executes the Mongoose `findByIdAndUpdate` function with the raw, unvalidated body, returning success even though the fields are ignored by Mongoose (or worse, depending on the Mongoose config, they might bypass validation).

### Request/Response Details (Empty Body Example)
**HTTP Request:**
```http
PUT /api/tutorials/60d5ec495400b925ac48e1f5 HTTP/1.1
Host: localhost:8080
Content-Type: application/json
x-access-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{}
```

**HTTP Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 46

{
  "message": "Tutorial was updated successfully."
}
```

### Impact Assessment
- **API Integrity:** The API behaves non-deterministically and provides misleading feedback to consumers, falsely claiming a resource has been successfully updated when it was not.
- **Resource Waste:** Encourages wasteful database connection operations (calling Mongoose updates with empty operations).
- **Security/Data Quality:** Passing unvalidated request bodies directly to Mongoose operators can lead to unexpected behaviors or data corruption if Mongoose schema strictness is not strictly enforced.

### Suggested Fix
Modify the `update` handler in `/app/controllers/tutorial.controller.js` to inspect the keys of `req.body` and validate them against allowed schema parameters before proceeding with the Mongoose call:

```javascript
exports.update = (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: "Data to update can not be empty!"
    });
  }

  const id = req.params.id;
  
  // Define allowed schema fields to update
  const allowedUpdates = ["title", "description", "published"];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({
      message: "Invalid update fields provided!"
    });
  }

  Tutorial.findByIdAndUpdate(id, req.body, { useFindAndModify: false })
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot update Tutorial with id=${id}. Maybe Tutorial was not found!`
        });
      } else res.send({ message: "Tutorial was updated successfully." });
    })
    .catch(err => {
      res.status(500).send({
        message: "Error updating Tutorial with id=" + id
      });
    });
};
```

---

## Bug ID: BUG-002
### Title: Use of Deprecated `findByIdAndRemove` Method for Tutorial Deletion (`DELETE /api/tutorials/:id`)

- **Severity:** Low
- **Priority:** Medium
- **Environment:** Docker container (`node:18-alpine`), Node.js 18.x, MongoDB 6.0, Mongoose 5.x
- **Component:** Tutorial Controller (`sut-config/tutorial.controller.js`) / Delete Endpoint (`DELETE /api/tutorials/:id`)

### Description
The tutorial delete endpoint uses Mongoose's `findByIdAndRemove` method. In newer versions of Mongoose (v7.x and v8.x), the `findByIdAndRemove` method has been deprecated and completely removed. While the SUT currently functions on Mongoose v5.x, keeping this deprecated call introduces a severe upgrade blocker and risks runtime exceptions if packages are updated without refactoring.

### Steps to Reproduce
1. Inspect the source file `sut-config/tutorial.controller.js`.
2. Locate the `exports.delete` method (lines 85-105).
3. Note the call: `Tutorial.findByIdAndRemove(id, { useFindAndModify: false })`.

### Expected Result
The controller should use a modern, future-proof delete method such as `findByIdAndDelete` or `deleteOne` to ensure compatibility with modern versions of the Mongoose ORM.

### Actual Result
The code utilizes `findByIdAndRemove`, which triggers deprecation warnings in Mongoose logs and will fail upon ORM library upgrades.

### Impact Assessment
- **Technical Debt:** Introduces friction to routine security patches and package updates. Upgrading the SUT's dependencies (e.g., migrating to Mongoose 7/8 for performance or security patches) will result in API crashes on DELETE operations.

### Suggested Fix
Refactor the delete controller method to use the non-deprecated `findByIdAndDelete`:

```javascript
// Delete a Tutorial with the specified id in the request
exports.delete = (req, res) => {
  const id = req.params.id;

  // Use findByIdAndDelete instead of deprecated findByIdAndRemove
  Tutorial.findByIdAndDelete(id)
    .then(data => {
      if (!data) {
        res.status(404).send({
          message: `Cannot delete Tutorial with id=${id}. Maybe Tutorial was not found!`
        });
      } else {
        res.send({
          message: "Tutorial was deleted successfully!"
        });
      }
    })
    .catch(err => {
      res.status(500).send({
        message: "Could not delete Tutorial with id=" + id
      });
    });
};
```

---

## Bug ID: BUG-003
### Title: Uncaught bcryptjs Exception on Non-String Password Input leading to SUT Crash (DoS vulnerability)

- **Severity:** High
- **Priority:** High
- **Environment:** Docker container (`node:18-alpine`), Node.js 18.x, MongoDB 6.0, Mongoose 5.x
- **Component:** Authentication Controller (`app/controllers/auth.controller.js`) / Signin Endpoint (`POST /api/auth/signin`)

### Description
If the request body of the `/api/auth/signin` endpoint contains a non-string object (e.g. `{"password": {"$ne": null}}`) in the `password` field, the controller passes it directly to `bcrypt.compareSync`. Because `bcryptjs` expects a string for the first parameter, it throws an unhandled exception: `Error: Illegal arguments: object, string`. Since the exception is thrown inside a promise/callback handler without a try-catch block, it propagates to the event loop, crashing the entire Node.js application process.

### Steps to Reproduce
1. Ensure the REST API is running.
2. Send a `POST /api/auth/signin` request with an object in the password field:
   ```json
   {
     "username": "testadmin",
     "password": { "$ne": null }
   }
   ```
3. Observe the server process crash (connection reset).

### Expected Result
The API should validate that both `username` and `password` fields are strings before processing, returning `400 Bad Request` on invalid types.

### Actual Result
The Node.js server immediately crashes and must be restarted by Docker Daemon, resulting in `ECONNRESET` / socket hangup for all concurrent requests.

### Impact Assessment
- **Denial of Service (DoS):** Attackers can repeatedly crash the API with a single, trivial malformed payload, preventing legitimate users from accessing any services.

### Suggested Fix
Validate that the input fields are strings in the controller:
```javascript
exports.signin = (req, res) => {
  if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
    return res.status(400).send({ message: "Invalid payload: username and password must be strings!" });
  }
  // Proceed with User.findOne...
};
```

---

## Bug ID: BUG-004
### Title: Console Stack Traces due to "Cannot set headers after they are sent" in `authJwt.js`

- **Severity:** Low
- **Priority:** Medium
- **Environment:** Docker container (`node:18-alpine`), Node.js 18.x, MongoDB 6.0, Mongoose 5.x
- **Component:** Authentication Middleware (`app/middlewares/authJwt.js`) / verifyToken Handler

### Description
In `authJwt.js`, the `catchError` helper uses `res.sendStatus(401)` and then calls `.send({ message: "..." })` on it. In Express, `sendStatus()` immediately sends the response and finishes it. Calling `.send()` on a finished response throws `ERR_HTTP_HEADERS_SENT` in the Node console.

### Suggested Fix
Use `res.status(401).send(...)` instead of `res.sendStatus(401).send(...)`.

