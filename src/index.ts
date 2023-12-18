import fetch from 'sync-fetch';
import { PubSub, Topic } from '@google-cloud/pubsub';
import { hrtime } from 'node:process';
import { FastifyInstance } from 'fastify'
import { buildPayload, asyncLocalStorage } from "apitoolkit-js";
export { observeAxios, ReportError } from "apitoolkit-js"
import { v4 as uuidv4 } from 'uuid';

export type Config = {
    apiKey: string;
    fastify: FastifyInstance;
    rootURL?: string;
    redactHeaders?: string[];
    redactRequestBody?: string[];
    redactResponseBody?: string[]
    service_version?: string | undefined;
    tags?: string[];
}

type ClientMetadata = {
    project_id: string,
    pubsub_project_id: string,
    topic_id: string,
    pubsub_push_service_account: any,
}

type Payload = {
    duration: number,
    host: string,
    method: string
    path_params: any,
    project_id: string
    proto_major: number
    proto_minor: number
    query_params: Record<string, any>
    raw_url: string
    referer: string
    request_body: string
    request_headers: Object,
    response_body: string
    response_headers: Object
    sdk_type: string
    status_code: number
    timestamp: string
    url_path: string
}

export default class APIToolkit {
    #topic: string;
    #pubsub: PubSub;
    #project_id: string;
    #redactHeaders: string[]
    #redactRequestBody: string[]
    #redactResponseBody: string[]
    #fastify: FastifyInstance
    #startTimes = new Map<string, bigint>()
    #service_version: string | undefined;
    #tags: string[];

    constructor(pubsub: PubSub, topic: string, project_id: string, fastify: FastifyInstance, redactHeaders: string[],
        redactReqBody: string[], redactRespBody: string[], service_version: string | undefined, tags: string[]) {
        this.#topic = topic
        this.#pubsub = pubsub
        this.#project_id = project_id
        this.#redactHeaders = redactHeaders
        this.#redactRequestBody = redactReqBody
        this.#redactResponseBody = redactRespBody
        this.#fastify = fastify
        this.#service_version = service_version
        this.#tags = tags
        this.init = this.init.bind(this)
    }

    static NewClient({ apiKey, fastify, rootURL = "https://app.apitoolkit.io", redactHeaders = [], redactRequestBody = [], redactResponseBody = [], service_version = undefined, tags = [] }: Config) {
        const resp = fetch(rootURL + "/api/client_metadata", {
            method: 'GET',
            headers: {
                Authorization: "Bearer " + apiKey,
                Accept: 'application/json',
            },
        })
        if (!resp.ok) throw new Error(`Error getting apitoolkit client_metadata ${resp.status}`);

        const clientMetadata = resp.json() as ClientMetadata
        const { pubsub_project_id, topic_id, project_id, pubsub_push_service_account } = clientMetadata;
        const pubsubClient = new PubSub({
            projectId: pubsub_project_id,
            authClient: (new PubSub()).auth.fromJSON(pubsub_push_service_account),
        });

        return new APIToolkit(pubsubClient, topic_id, project_id, fastify, redactHeaders, redactRequestBody, redactResponseBody, service_version, tags);
    }

    private getStringValue(val: unknown): string {
        if (!val) return "";
        if (typeof val === "string") {
            return val;
        } else if (Buffer.isBuffer(val)) {
            return val.toString();
        } else {
            try {
                return JSON.stringify(val);
            } catch (error) {
                return "";
            }
        }
    }

    private getQuery(query: unknown) {
        try {
            return { ...(query as any) }
        } catch (error) {
            return {}
        }
    }
    public publishMessage(payload: Payload) {
        this.#pubsub.topic(this.#topic).publishMessage({ json: payload })
    }
    public init() {


        this.#fastify.addHook('preHandler', (request, reply, done) => {
            this.#startTimes.set(request.id, hrtime.bigint())
            asyncLocalStorage.run(new Map(), () => {
                asyncLocalStorage.getStore()!.set('AT_client', this);
                asyncLocalStorage.getStore()!.set('AT_project_id', this.#project_id);
                asyncLocalStorage.getStore()!.set('AT_config', { tags: this.#tags, serviceVersion: this.#service_version });
                asyncLocalStorage.getStore()!.set('AT_errors', []);
                const msg_id: string = uuidv4();
                asyncLocalStorage.getStore()!.set('AT_msg_id', msg_id);
                done()
            })
        });

        this.#fastify.addHook('onSend', async (request, reply, data) => {
            try {
                let reqBody = this.getStringValue(request.body)
                let resBody = this.getStringValue(data)

                const reqObjEntries = Object.entries(request.headers).map(([k, v]) => {
                    if (typeof v === "string") return [k, [v]]
                    return [k, v]
                })

                const reqHeaders = Object.fromEntries(reqObjEntries)

                const resObjEntries = Object.entries(reply.getHeaders()).map(([k, v]) => {
                    if (typeof v === "string") return [k, [v]]
                    return [k, v]
                })
                const resHeaders = Object.fromEntries(resObjEntries)

                const query = this.getQuery(request.query)
                const queryObjEntries = Object.entries(query).map(([k, v]) => {
                    if (typeof v === "string") return [k, [v]]
                    return [k, v]
                })
                const errors = asyncLocalStorage.getStore()?.get('AT_errors') ?? [];
                const msg_id = asyncLocalStorage.getStore()?.get('AT_msg_id') ?? uuidv4();
                const queryParams = Object.fromEntries(queryObjEntries)
                const target = this.#startTimes.get(request.id)
                const start_time = target ? target : hrtime.bigint()
                this.#startTimes.delete(request.id)
                const pathParams = request.params ?? {}
                const payload = buildPayload({
                    start_time: start_time,
                    host: request.hostname,
                    method: request.method,
                    reqParams: pathParams,
                    project_id: this.#project_id,
                    reqQuery: queryParams,
                    reqBody: reqBody,
                    respBody: resBody,
                    responseHeaders: resHeaders,
                    requestHeaders: reqHeaders,
                    sdk_type: "JsFastify",
                    status_code: reply.statusCode,
                    raw_url: request.url,
                    url_path: request.routerPath || "",
                    redactHeaderLists: this.#redactHeaders,
                    redactRequestBody: this.#redactRequestBody,
                    redactResponseBody: this.#redactResponseBody,
                    errors: errors,
                    service_version: this.#service_version,
                    tags: this.#tags,
                    msg_id: msg_id,
                    parent_id: undefined
                })
                this.publishMessage(payload)
                return data
            } catch (error) {
                return data
            }
        });
    }
}