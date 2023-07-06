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

Before you can start collecting and publishing request/response data, you need to initialize the SDK. The initialization process involves creating an instance of the `APIToolkit` class and configuring it with the required parameters and then calling the `init` method of the instance.

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
- `rootURL` (optional): The root URL for the APIToolkit API. Defaults to "https://app.apitoolkit.io".
- `redactHeaders` (optional): An array of header names to redact from the captured request headers (case insensitive).
- `redactRequestBody` (optional): An array of JSONPath expressions specifying fields to redact from the request body.
- `redactResponseBody` (optional): An array of JSONPath expressions specifying fields to redact from the response body.

### Redacting Sensitive Information

The SDK provides options for redacting sensitive information from the captured data. The `redactHeaders`, `redactRequestBody`, and `redactResponseBody` configuration options allow you to specify headers and fields to be redacted.

#### Redacting Headers

To redact specific headers, provide an array of header names to the `redactHeaders` configuration option:

```javascript
const redactHeaders = ['Authorization', 'X-Secret-Token'];

const toolkit = APIToolkit.NewClient({
  apiKey,
  fastify,
  redactHeaders,
});
```

Any headers specified in the `redactHeaders` array will be replaced with `"[CLIENT_REDACTED]"` in the captured data.

#### Redacting Request and Response Fields

To redact specific fields in the request and response bodies, provide an array of JSONPath expressions to the `redactRequestBody` and `redactResponseBody` configuration options:

```javascript
const redactRequestBody = ['$.password', '$.user.email'];

const toolkit = APIToolkit.NewClient({
  apiKey,
  fastify,
  redactRequestBody,
});
```

The JSONPath expressions in the `redactRequestBody` and `redactResponseBody` arrays will

be used to locate the corresponding fields in the request and response bodies. The values of these fields will be replaced with `"[CLIENT_REDACTED]"` in the captured data.
