"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _APIToolkit_topic, _APIToolkit_pubsub, _APIToolkit_project_id, _APIToolkit_redactHeaders, _APIToolkit_redactRequestBody, _APIToolkit_redactResponseBody, _APIToolkit_fastify, _APIToolkit_startTimes, _APIToolkit_service_version, _APIToolkit_tags, _APIToolkit_debug;
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIToolkit = exports.ReportError = exports.observeAxios = void 0;
const sync_fetch_1 = __importDefault(require("sync-fetch"));
const pubsub_1 = require("@google-cloud/pubsub");
const node_process_1 = require("node:process");
const uuid_1 = require("uuid");
const apitoolkit_js_1 = require("apitoolkit-js");
var apitoolkit_js_2 = require("apitoolkit-js");
Object.defineProperty(exports, "observeAxios", { enumerable: true, get: function () { return apitoolkit_js_2.observeAxios; } });
Object.defineProperty(exports, "ReportError", { enumerable: true, get: function () { return apitoolkit_js_2.ReportError; } });
class APIToolkit {
    constructor(pubsub, topic, project_id, fastify, redactHeaders, redactReqBody, redactRespBody, service_version, tags, debug) {
        _APIToolkit_topic.set(this, void 0);
        _APIToolkit_pubsub.set(this, void 0);
        _APIToolkit_project_id.set(this, void 0);
        _APIToolkit_redactHeaders.set(this, void 0);
        _APIToolkit_redactRequestBody.set(this, void 0);
        _APIToolkit_redactResponseBody.set(this, void 0);
        _APIToolkit_fastify.set(this, void 0);
        _APIToolkit_startTimes.set(this, new Map());
        _APIToolkit_service_version.set(this, void 0);
        _APIToolkit_tags.set(this, void 0);
        _APIToolkit_debug.set(this, void 0);
        __classPrivateFieldSet(this, _APIToolkit_topic, topic, "f");
        __classPrivateFieldSet(this, _APIToolkit_pubsub, pubsub, "f");
        __classPrivateFieldSet(this, _APIToolkit_project_id, project_id, "f");
        __classPrivateFieldSet(this, _APIToolkit_redactHeaders, redactHeaders, "f");
        __classPrivateFieldSet(this, _APIToolkit_redactRequestBody, redactReqBody, "f");
        __classPrivateFieldSet(this, _APIToolkit_redactResponseBody, redactRespBody, "f");
        __classPrivateFieldSet(this, _APIToolkit_fastify, fastify, "f");
        __classPrivateFieldSet(this, _APIToolkit_service_version, service_version, "f");
        __classPrivateFieldSet(this, _APIToolkit_tags, tags, "f");
        __classPrivateFieldSet(this, _APIToolkit_debug, debug, "f");
        this.init = this.init.bind(this);
    }
    static NewClient({ apiKey, fastify, rootURL = "https://app.apitoolkit.io", redactHeaders = [], redactRequestBody = [], redactResponseBody = [], service_version = undefined, debug = false, tags = [], }) {
        const resp = (0, sync_fetch_1.default)(rootURL + "/api/client_metadata", {
            method: "GET",
            headers: {
                Authorization: "Bearer " + apiKey,
                Accept: "application/json",
            },
        });
        if (!resp.ok)
            throw new Error(`Error getting apitoolkit client_metadata ${resp.status}`);
        const clientMetadata = resp.json();
        const { pubsub_project_id, topic_id, project_id, pubsub_push_service_account, } = clientMetadata;
        const pubsubClient = new pubsub_1.PubSub({
            projectId: pubsub_project_id,
            authClient: new pubsub_1.PubSub().auth.fromJSON(pubsub_push_service_account),
        });
        if (debug) {
            console.log("apitoolkit: authenticated successfully");
        }
        return new APIToolkit(pubsubClient, topic_id, project_id, fastify, redactHeaders, redactRequestBody, redactResponseBody, service_version, tags, debug);
    }
    getStringValue(val) {
        if (!val)
            return "";
        if (typeof val === "string") {
            return val;
        }
        else if (Buffer.isBuffer(val)) {
            return val.toString();
        }
        else {
            try {
                return JSON.stringify(val);
            }
            catch (error) {
                return "";
            }
        }
    }
    getQuery(query) {
        try {
            return { ...query };
        }
        catch (error) {
            return {};
        }
    }
    publishMessage(payload) {
        if (__classPrivateFieldGet(this, _APIToolkit_debug, "f")) {
            console.log("apitoolkit: publishing message");
            console.log(payload);
        }
        __classPrivateFieldGet(this, _APIToolkit_pubsub, "f").topic(__classPrivateFieldGet(this, _APIToolkit_topic, "f")).publishMessage({ json: payload });
    }
    getConfig() {
        return {
            project_id: __classPrivateFieldGet(this, _APIToolkit_project_id, "f"),
            config: {
                service_version: __classPrivateFieldGet(this, _APIToolkit_service_version, "f"),
                tags: __classPrivateFieldGet(this, _APIToolkit_tags, "f"),
            },
        };
    }
    observeAxios(axiosInstance, urlWildcard, redactHeaders, redactRequestBody, redactResponseBody) {
        return (0, apitoolkit_js_1.observeAxios)(axiosInstance, urlWildcard, redactHeaders, redactRequestBody, redactResponseBody, true, this);
    }
    init() {
        __classPrivateFieldGet(this, _APIToolkit_fastify, "f").addHook("preHandler", (request, _reply, done) => {
            if (__classPrivateFieldGet(this, _APIToolkit_debug, "f")) {
                console.log("apitoolkit:  preHandler hook called");
            }
            __classPrivateFieldGet(this, _APIToolkit_startTimes, "f").set(request.id, node_process_1.hrtime.bigint());
            apitoolkit_js_1.asyncLocalStorage.run(new Map(), () => {
                apitoolkit_js_1.asyncLocalStorage.getStore().set("AT_client", this);
                apitoolkit_js_1.asyncLocalStorage.getStore().set("AT_project_id", __classPrivateFieldGet(this, _APIToolkit_project_id, "f"));
                apitoolkit_js_1.asyncLocalStorage.getStore().set("AT_config", {
                    tags: __classPrivateFieldGet(this, _APIToolkit_tags, "f"),
                    serviceVersion: __classPrivateFieldGet(this, _APIToolkit_service_version, "f"),
                });
                apitoolkit_js_1.asyncLocalStorage.getStore().set("AT_errors", []);
                const msg_id = (0, uuid_1.v4)();
                apitoolkit_js_1.asyncLocalStorage.getStore().set("AT_msg_id", msg_id);
                done();
            });
        });
        __classPrivateFieldGet(this, _APIToolkit_fastify, "f").addHook("onSend", async (request, reply, data) => {
            if (__classPrivateFieldGet(this, _APIToolkit_debug, "f")) {
                console.log("apitoolkit:  onSend hook called");
            }
            try {
                const reqBody = this.getStringValue(request.body);
                const resBody = this.getStringValue(data);
                const reqObjEntries = Object.entries(request.headers).map(([k, v]) => {
                    if (typeof v === "string")
                        return [k, [v]];
                    return [k, v];
                });
                const reqHeaders = Object.fromEntries(reqObjEntries);
                const resObjEntries = Object.entries(reply.getHeaders()).map(([k, v]) => {
                    if (typeof v === "string")
                        return [k, [v]];
                    return [k, v];
                });
                const resHeaders = Object.fromEntries(resObjEntries);
                const query = this.getQuery(request.query);
                const queryObjEntries = Object.entries(query).map(([k, v]) => {
                    if (typeof v === "string")
                        return [k, [v]];
                    return [k, v];
                });
                const errors = apitoolkit_js_1.asyncLocalStorage.getStore()?.get("AT_errors") ?? [];
                const msg_id = apitoolkit_js_1.asyncLocalStorage.getStore()?.get("AT_msg_id") ?? (0, uuid_1.v4)();
                const queryParams = Object.fromEntries(queryObjEntries);
                const target = __classPrivateFieldGet(this, _APIToolkit_startTimes, "f").get(request.id);
                const start_time = target ? target : node_process_1.hrtime.bigint();
                __classPrivateFieldGet(this, _APIToolkit_startTimes, "f").delete(request.id);
                const pathParams = request.params ?? {};
                const payload = (0, apitoolkit_js_1.buildPayload)({
                    start_time: start_time,
                    host: request.hostname,
                    method: request.method,
                    reqParams: pathParams,
                    project_id: __classPrivateFieldGet(this, _APIToolkit_project_id, "f"),
                    reqQuery: queryParams,
                    reqBody: reqBody,
                    respBody: resBody,
                    responseHeaders: resHeaders,
                    requestHeaders: reqHeaders,
                    sdk_type: "JsFastify",
                    status_code: reply.statusCode,
                    raw_url: request.url,
                    url_path: request.routeOptions.url,
                    redactHeaderLists: __classPrivateFieldGet(this, _APIToolkit_redactHeaders, "f"),
                    redactRequestBody: __classPrivateFieldGet(this, _APIToolkit_redactRequestBody, "f"),
                    redactResponseBody: __classPrivateFieldGet(this, _APIToolkit_redactResponseBody, "f"),
                    errors: errors,
                    service_version: __classPrivateFieldGet(this, _APIToolkit_service_version, "f"),
                    tags: __classPrivateFieldGet(this, _APIToolkit_tags, "f"),
                    msg_id: msg_id,
                    parent_id: undefined,
                });
                this.publishMessage(payload);
                return data;
            }
            catch (error) {
                return data;
            }
        });
        if (__classPrivateFieldGet(this, _APIToolkit_debug, "f")) {
            console.log("apitoolkit:  onSend hook called");
        }
    }
}
exports.APIToolkit = APIToolkit;
_APIToolkit_topic = new WeakMap(), _APIToolkit_pubsub = new WeakMap(), _APIToolkit_project_id = new WeakMap(), _APIToolkit_redactHeaders = new WeakMap(), _APIToolkit_redactRequestBody = new WeakMap(), _APIToolkit_redactResponseBody = new WeakMap(), _APIToolkit_fastify = new WeakMap(), _APIToolkit_startTimes = new WeakMap(), _APIToolkit_service_version = new WeakMap(), _APIToolkit_tags = new WeakMap(), _APIToolkit_debug = new WeakMap();
exports.default = APIToolkit;
