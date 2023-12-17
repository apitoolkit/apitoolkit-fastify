"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../index"));
const pubsub_1 = require("@google-cloud/pubsub");
const fastify_1 = __importDefault(require("fastify"));
const fastify = (0, fastify_1.default)({});
describe('testing headers and jsonpath redaction', () => {
    let myClassInstance;
    beforeEach(() => {
        const pubsub = new pubsub_1.PubSub({
            projectId: "pubsub_project_id"
        });
        myClassInstance = new index_1.default(pubsub, "topic_id", "project_id", fastify, [], [], []);
    });
    it('should redact headers correctly', () => {
        const headers = { 'Authorization': ["token"], "User-Agent": ["MyApp"], "Content-Type": ["text/json"] };
        const headersToRedact = ['Authorization', 'content-type'];
        const redactedHeaders = myClassInstance['redactHeaders'](headers, headersToRedact);
        expect(redactedHeaders['Authorization']).toEqual(['[CLIENT_REDACTED]']);
        expect(redactedHeaders['Content-Type']).toEqual(['[CLIENT_REDACTED]']);
        expect(redactedHeaders['User-Agent']).toEqual(['MyApp']);
    });
    it('should redact fields correctly', () => {
        const body = '{"user": {"name": "John", "email": "john@example.com", "books": [{"title": "Book 1", "author": "Author 1"},{"title": "Book 2", "author": "Author 2"}]}}';
        const fieldsToRedact = ['$.user.email', 'user.books[*].author'];
        const redactedBody = myClassInstance['redactFields'](body, fieldsToRedact);
        expect(redactedBody).toContain('"email":"[CLIENT_REDACTED]"');
        expect(redactedBody).toContain('{"title":"Book 1","author":"[CLIENT_REDACTED]"},{"title":"Book 2","author":"[CLIENT_REDACTED]"}');
        expect(redactedBody).toContain('"name":"John"');
    });
});
