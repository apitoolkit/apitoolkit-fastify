import fetch from 'node-fetch';
import { PubSub } from '@google-cloud/pubsub';
import { hrtime } from 'node:process';
import jsonpath from "jsonpath"
import { FastifyInstance } from 'fastify'

export type Config = {
    apiKey: string;
    fastify: FastifyInstance;
    rootURL?: string;
    redactHeaders?: string[];
    redactRequestBody?: string[];
    redactResponseBody?: string[]
}

type ClientMetadata = {
    project_id: string,
    pubsub_project_id: string,
    topic_id: string,
    pubsub_push_service_account: any,
}

type Payload = {
    duration: number
    host: string
    method: string
    path_params: Object,
    project_id: string
    proto_major: number
    proto_minor: number
    query_params: Map<string, string[]>
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

    constructor(pubsub: PubSub, topic: string, project_id: string, fastify: FastifyInstance, redactHeaders: string[], redactReqBody: string[], redactRespBody: string[]) {
        this.#topic = topic
        this.#pubsub = pubsub
        this.#project_id = project_id
        this.#redactHeaders = redactHeaders
        this.#redactRequestBody = redactReqBody
        this.#redactResponseBody = redactRespBody
        this.#fastify = fastify
        this.init = this.init.bind(this)
    }

    static async NewClient({ apiKey, fastify, rootURL = "https://app.apitoolkit.io", redactHeaders = [], redactRequestBody = [], redactResponseBody = [] }: Config) {
        const resp = await fetch(rootURL + "/api/client_metadata", {
            method: 'GET',
            headers: {
                Authorization: "Bearer " + apiKey,
                Accept: 'application/json',
            },
        })
        if (!resp.ok) throw new Error(`Error getting apitoolkit client_metadata ${resp.status}`);

        const clientMetadata = await resp.json() as ClientMetadata
        const { pubsub_project_id, topic_id, project_id } = clientMetadata;
        const pubsubClient = new PubSub({
            projectId: pubsub_project_id
        });

        return new APIToolkit(pubsubClient, topic_id, project_id, fastify, redactHeaders, redactRequestBody, redactResponseBody);
    }

    public init() {
        this.#fastify.addHook('preHandler', (request, reply, done) => {
            console.log(request.body)
            this.#startTimes.set(request.id, hrtime.bigint())
            done();
        });
        this.#fastify.addHook('onSend', async (request, reply, data) => {
            try {
                console.log(request.body)
                const reqBody = request.body instanceof Object ? JSON.stringify(request.body) : String(request.body)
                const query = request.query instanceof Object ? request.query : {}
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

                const queryObjEntries = Object.entries(query).map(([k, v]) => {
                    if (typeof v === "string") return [k, [v]]
                    return [k, v]
                })
                const queryParams = Object.fromEntries(queryObjEntries)
                const target = this.#startTimes.get(request.id)
                const start_time = target ? target : hrtime.bigint()
                this.#startTimes.delete(request.id)
                const pathParams = request.params ?? {}
                const payload: Payload = {
                    duration: Number(hrtime.bigint() - start_time),
                    host: request.hostname,
                    method: request.method,
                    path_params: pathParams,
                    project_id: this.#project_id,
                    proto_minor: 1,
                    proto_major: 1,
                    query_params: queryParams,
                    raw_url: request.url,
                    referer: request.headers.referer ?? '',
                    request_body: Buffer.from(this.redactFields(reqBody, this.#redactRequestBody)).toString('base64'),
                    request_headers: this.redactHeaders(reqHeaders, this.#redactHeaders),
                    response_body: Buffer.from(this.redactFields(String(data), this.#redactResponseBody)).toString('base64'),
                    response_headers: this.redactHeaders(resHeaders, this.#redactHeaders),
                    sdk_type: "JsExpress",
                    status_code: reply.statusCode,
                    timestamp: new Date().toISOString(),
                    url_path: request.routerPath
                }
                this.#pubsub.topic(this.#topic).publishMessage({ json: payload })
            } catch (error) {
            }
            return data
        });
    }

    private redactHeaders(headers: any, headersToRedact: string[]) {
        for (const [key, value] of Object.entries(headers)) {
            if (headersToRedact.some(header => header.includes(key) || header.includes(key.toLocaleLowerCase()))) {
                console.log(key)
                headers[key] = ["[CLIENT_REDACTED]"]
            } else if (key === "Cookie" || key === "cookie") {
                headers[key] = ["[CLIENT_REDACTED]"]
            }
            else {
                headers[key] = value
            }
        }
        return headers
    }

    private redactFields(body: string, fieldsToRedact: string[]): string {
        try {
            const bodyOB = JSON.parse(body)
            fieldsToRedact.forEach(path => {
                jsonpath.apply(bodyOB, path, function () { return "[CLIENT_REDACTED]" });
            })
            return JSON.stringify(bodyOB)
        } catch (error) {
            return ""
        }
    }
}
