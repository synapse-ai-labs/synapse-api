# SynapseAPI - Vector Embeddings using Cloudflare's Vectorize and OpenAI

## Overview
This is a Cloudflare Worker with OpenAPI 3.1 using [itty-router-openapi](https://github.com/cloudflare/itty-router-openapi).

This project is a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

## Get Started
1. Sign up for a Cloudflare Workers account
2. Sign up for OpenAI API access and obtain an API key 
3. Create a `.dev.vars` file (Git-ignored). Add an env entry for `OPENAI_API_KEY`.
4. Clone this project and install dependencies using yarn install (maybe) [could be npm install]
5. Run `wrangler login` to auth with your Cloudflare account in **wrangler**
6. Run `yarn create-db` to create a D1 database (name defaults to: **synapse**)
7. Run `yarn create-db-schema` to create the relevant tables for your D1 metadata layer.
8. Run `yarn create-vectorstore --dimensions=1024 --metric cosine`.

As shown in the above yarn command, you will need to specify `dimensions` and distance `metric` params. See [here](https://developers.cloudflare.com/vectorize/configuration/create-indexes/#distance-metrics) for an up-to-date list of allowed values. At the time of writing, the following are supported: `cosine`, `euclidean`, and `dot-product`.

The max `dimensions` value at the time of writing is **1536** (which appears to originate from OpenAI's `ada-002` embedding model output size). See [here](https://developers.cloudflare.com/vectorize/configuration/create-indexes/#dimensions) for more information on why dimensions are relevant. 

Both the `metric` and `dimensions` values for an index are fixed, and cannot be changed once the Vectorize index has been created.

9. Run `wrangler deploy` to deploy the API to production, making it accessible remotely. 

## Endpoints
### `POST /api/namespaces/:namespace/insert`
**Insert an embedding vector**


### `POST /api/namespaces/:namespace/query` 
**Query a namespace**

### `POST /api/namespaces/`
**Create a namespace (a partition key within an index)**

### `GET /api/namespaces/`
**List namespaces**

### `GET /api/namespaces/:namespace/`
**Retrieve a namespace by name**

### `DELETE /api/namespaces/:namespace/`
**Delete a namespace by name**

### `DELETE /api/namespaces/:namespace/vectors`
**List vectors associated with a given namespace**

### `GET /api/namespaces/:namespace/:vectorId/`
**Retrieve a specific vector in a given namespace**

### `DELETE /api/namespaces/:namespace/:vectorId/`
**Delete a vector in a given namespace**


## OpenAI
By default, this project uses OpenAI's `text-embedding-3-large` model to embed the provided text. You may override this either by setting an alternative valid model name env 
`DEFAULT_OPENAI_EMBEDDING_MODEL` or when inserting an embedding vector.

You can only override the `model` request body param when inserting the very first vector into a namespace. Once a namespace has been created, the embedding model associated with the namespace becomes fixed. The rationale behind this is that the embeddings of particular model cannot be shared with the embeddings of anoher model - (see here)[https://community.openai.com/t/are-embeddings-tied-to-a-particular-model/286394] for more info.
If you override the `model` request body param when inserting a vector, the **namespace** in which you are intending to insert the vecto

## Limitations


## Production
Access OpenAPI documentation at /docs.

## Local Development
1. Run `wrangler dev` to start a local instance of the API.
2. Open `http://localhost:9000/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.
