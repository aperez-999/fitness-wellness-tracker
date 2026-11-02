import assert from "node:assert/strict";
import test from "node:test";

import { errorHandler } from "../src/middleware/errorHandler.js";

function respond(err) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  errorHandler(err, {}, res, () => {});
  return res;
}

test("unexpected errors return a generic 500 and are logged on the server", (t) => {
  const log = t.mock.method(console, "error", () => {});
  const error = new Error("connect ECONNREFUSED mongodb://dayform:secret@db.internal:27017");

  const res = respond(error);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: "Internal server error" });
  assert.equal(log.mock.callCount(), 1);
  assert.equal(log.mock.calls[0].arguments[0], error);
});

test("5xx statuses keep their code but never their message or stack", (t) => {
  t.mock.method(console, "error", () => {});
  for (const status of [500, 502, 503]) {
    const error = Object.assign(new Error("MONGODB_URI is not set in environment variables"), { status });
    const res = respond(error);
    assert.equal(res.statusCode, status);
    assert.deepEqual(res.body, { message: "Internal server error" });
    assert.doesNotMatch(JSON.stringify(res.body), /MONGODB_URI|at .*\.js/);
  }
});

test("missing or invalid statuses are treated as 500", (t) => {
  t.mock.method(console, "error", () => {});
  for (const err of [{}, { status: "400" }, { status: 200 }, { status: 302 }, { status: 650 }, "boom", null]) {
    const res = respond(err);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Internal server error" });
  }
});

test("client errors keep their status and message and are not logged", (t) => {
  const log = t.mock.method(console, "error", () => {});
  // The shape body-parser gives a malformed JSON body, including the raw text.
  const parseError = Object.assign(new SyntaxError("Unexpected end of JSON input"), {
    status: 400,
    expose: true,
    type: "entity.parse.failed",
    body: '{"email":"a@example.test","password":"Hunter2!pass"',
  });

  const res = respond(parseError);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "Unexpected end of JSON input" });
  assert.equal(log.mock.callCount(), 0);

  assert.deepEqual(respond(Object.assign(new Error("request entity too large"), { status: 413 })).body, {
    message: "request entity too large",
  });
  assert.deepEqual(respond({ status: 404 }).body, { message: "Request failed" });
  assert.equal(log.mock.callCount(), 0);
});
