# Fastify SDK Documentation

The Fastify SDK provided by APIToolkit is a library that allows you to integrate your Fastify applications with APIToolkit's monitoring and logging capabilities. By using this SDK, you can automatically collect and publish relevant data about incoming requests and outgoing responses to a Google Cloud Pub/Sub topic.

## Installation

To install the APIToolkit Fastify SDK, you need to add it as a dependency in your project:

```bash
npm install apitoolkit-fastify
```

## Usage

### Importing the SDK

To use the Fastify SDK, you need to import it into your application:

```javascript
import APIToolkit from 'apitoolkit-fastify';
```

### Adding the SDK to a fastify project

To begin collecting and publishing request/response data, it is essential to initialize the SDK. This entails creating an instance of the `APIToolkit` class and configuring it with necessary parameters. These parameters include your app's Fastify instance and an APIToolkit API key. You can learn how to generate API keys by visiting this link. Finally, invoke the init method of the instance to complete the initialization process.

```javascript
import APIToolkit from 'apitoolkit-fastify';
import Fastify from 'fastify';
const fastify = Fastify();

// Create and initialize an instance of the APIToolkit
const apittoolkitClient = await APIToolkit.NewClient({
  apiKey: 'YOUR_API_KEY',
  fastify,
});
apitoolkitClient.init();

//Rest of your app
fastify.get('/hello', function (request, reply) {
  reply.send({ hello: 'world' });
});

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
```

The `NewClient` method initializes the SDK with the provided configuration. It requires the following parameters (others are optional):

- `apiKey`: Your APIToolkit API key.
- `fastify`: An instance of Fastify.

### Configuration Options

The `NewClient` method accepts an optional configuration object with the following properties:

- `apiKey` (required): Your APIToolkit API key.
- `fastify` (required): An instance of Fastify.
- `redactHeaders` (optional): An array of header names to redact from the captured request headers (case insensitive).
- `redactRequestBody` (optional): An array of JSONPath expressions specifying fields to redact from the request body.
- `redactResponseBody` (optional): An array of JSONPath expressions specifying fields to redact from the response body.

### Redacting Sensitive Information

The SDK provides options for redacting sensitive information from the captured data. The `redactHeaders`, `redactRequestBody`, and `redactResponseBody` configuration options allow you to specify headers and fields to be redacted.

#### Redacting Headers

To redact specific headers, provide an array of case insensitive header names to the `redactHeaders` configuration option:

```javascript
import APIToolkit from 'apitoolkit-fastify';
import Fastify from 'fastify';
const fastify = Fastify();

const redactHeaders = ['Authorization', 'X-Secret-Token'];
const apittoolkitClient = APIToolkit.NewClient({
  apiKey: '<YOUR API KEY>',
  fastify,
  redactHeaders,
});

apitoolkitClient.init();

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
```

Any headers specified in the `redactHeaders` array will be replaced with `"[CLIENT_REDACTED]"` in the captured data.

#### Redacting Request and Response Fields

To redact specific fields in the request and response bodies, provide an array of JSONPath expressions to the `redactRequestBody` and `redactResponseBody` configuration options:

```javascript
import APIToolkit from 'apitoolkit-fastify';
import Fastify from 'fastify';
const fastify = Fastify();

const redactRequestBody = ['$.password', '$.user.email'];

const apittoolkitClient = APIToolkit.NewClient({
  apiKey: '<YOUR API KEY>',
  fastify,
  redactRequestBody,
});

apitoolkitClient.init();

fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
```

The JSONPath expressions in the `redactRequestBody` and `redactResponseBody` arrays will
be used to locate the corresponding fields in the request and response bodies. The values of these fields will be replaced with `"[CLIENT_REDACTED]"` in the captured data.

It is important to note that while the RedactHeaders config field accepts a list of headers(case insensitive), the RedactRequestBody and RedactResponseBody expect a list of JSONPath strings as arguments.
The choice of JSONPath was selected to allow you have great flexibility in descibing which fields within your responses are sensitive. Also note that these list of items to be redacted will be aplied to all endpoint requests and responses on your server. To learn more about jsonpath to help form your queries, please take a look at this cheatsheet: https://lzone.de/cheat-sheet/JSONPath
