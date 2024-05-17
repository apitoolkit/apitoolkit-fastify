import { PubSub } from '@google-cloud/pubsub';
import { FastifyInstance } from 'fastify';
export { observeAxios as obsAxios, ReportError } from "apitoolkit-js";
import { AxiosInstance } from 'axios';
export type Config = {
    apiKey: string;
    fastify: FastifyInstance;
    rootURL?: string;
    redactHeaders?: string[];
    redactRequestBody?: string[];
    redactResponseBody?: string[];
    service_version?: string | undefined;
    tags?: string[];
};
type Payload = {
    duration: number;
    host: string;
    method: string;
    path_params: any;
    project_id: string;
    proto_major: number;
    proto_minor: number;
    query_params: Record<string, any>;
    raw_url: string;
    referer: string;
    request_body: string;
    request_headers: Record<string, any>;
    response_body: string;
    response_headers: Record<string, any>;
    sdk_type: string;
    status_code: number;
    timestamp: string;
    url_path: string;
};
export default class APIToolkit {
    #private;
    constructor(pubsub: PubSub, topic: string, project_id: string, fastify: FastifyInstance, redactHeaders: string[], redactReqBody: string[], redactRespBody: string[], service_version: string | undefined, tags: string[]);
    static NewClient({ apiKey, fastify, rootURL, redactHeaders, redactRequestBody, redactResponseBody, service_version, tags }: Config): APIToolkit;
    private getStringValue;
    private getQuery;
    publishMessage(payload: Payload): void;
    observeAxios(axiosInstance: AxiosInstance, urlWildcard?: string | undefined, redactHeaders?: string[] | undefined, redactRequestBody?: string[] | undefined, redactResponseBody?: string[] | undefined): any;
    init(): void;
}
