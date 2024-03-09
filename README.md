# SynapseAPI - Serverless Vector Embeddings API using Cloudflare's Vectorize and OpenAI

## Overview
This is a Cloudflare Worker with OpenAPI 3.1 using [itty-router-openapi](https://github.com/cloudflare/itty-router-openapi).

This project is a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

## Key Features
- Serverless
- Globally distributed, with data replication across multiple zones, ensuring a high level of availability and resiliency. 
- API-level validation


## Get Started
1. [Sign up](https://dash.cloudflare.com/sign-up/workers-and-pages) for a paid Cloudflare Workers account. You will need to purchase a $5/month plan.
2. [Sign up](https://platform.openai.com/signup) (or sign in if you already have an account) for OpenAI API access and obtain an API key 
3. Run the following:
```
git clone https://github.com/aaronjoyce/synapse-api.git
cd synapse-api
yarn install
```
4. Create a `.dev.vars` file (included in the repo's .gitignore file). Add an env entry for `OPENAI_API_KEY`, setting the value to the API key generated in step **#2**.
5. Run `yarn login` to auth with your Cloudflare account using **wrangler**
6. Run `yarn create-db` to create a D1 database (name defaults to **synapse** - you can override it in the wrangler.toml file)
> [!NOTE]
> Copy and paste the output into the `wrangler.toml` file. It should look like the following:
> ```[[d1_databases]]
> binding = "DB" # i.e. available in your Worker on env.DB
> database_name = "synapse"
> database_id = "40fde3cc-1b73-4bc8-b66b-79ae3f2e2ba8"
> ```

7. Run `yarn create-db-schema` to create the relevant tables for your D1 metadata layer.
8. Run `yarn create-vectorstore --dimensions=1024 --metric cosine`.

> [!NOTE]
> Copy and paste the output into the `wrangler.toml` file. It should look like the following:
> ```[[vectorize]]
> binding = "VECTORIZE_INDEX" # available within your Worker on env.VECTORIZE_INDEX
> index_name = "synapse"
> ```

> [!IMPORTANT]
> As shown in the above yarn command, you will need to specify `dimensions` and distance `metric` params. See [here](https://developers.cloudflare.com/vectorize/configuration/create-indexes/#distance-metrics) for an up-to-date list of allowed values. At the time of writing, the following are supported: 
>
> - `cosine`
> - `euclidean`
> - `dot-product`.
>
> The max `dimensions` value at the time of writing is **1536** (which appears to originate from OpenAI's `ada-002` embedding model output size). See [here](https://developers.cloudflare.com/vectorize/configuration/create-indexes/#dimensions) for more information on why dimensions are relevant. 
> 
> Both the `metric` and `dimensions` values for an index are fixed, and cannot be changed once the Vectorize index has been created.

9. Run `yarn wrangler deploy` to deploy the API to production, making it accessible remotely. 

## Endpoints

### `POST /api/namespaces/:namespace/insert`
**Insert one or more embedding vectors**

**Path Params**

- `namespace: string`: Name of the namespace in which vectors are being inserted. Automatigcally created if the namespace doesn't already exist.

**Request Body**

Example:
```
{
    "vectors": [{
        "text": "embed text #1",
        "metadata": '{"userId": 1}'
    }],
    "model": "text-embedding-3-large" 
}
```

Fields:
```
{
    vectors: { 
        text: string, 
        metadata: string (JSON-encoded object) [optional],
        id: string [optional, defaults to a UUID] 
    }[],
    model: string
}
```

**Returns**
```
{
    "vectors": [
        {
        "id": "48a4fcee-1b02-4fa0-92c2-22c1213e7434",
	    "source": "embed text #1",
	    "metadata": {"userId": 1},
	    "values": [0.015899453, 0.010525339, -0.016939605, ..., -0.025731359],
	    "model": "text-embedding-3-large"
        }
    ] 
}
```

### `POST /api/namespaces/:namespace/query` 
**Query a namespace**
Generates an embedding using the model associated with the namespace, 
and queries the embedding output against the existing vectors in the namespace.


**Path Params**
- `namespace: string`: Name of the namespace against which vector queries are performed

**Request Body**

Example:
```
{
    "inputs": "embed text #2" 
}
```

Fields:
```
{
    "inputs": string
}
```

**Returns**
```
{
    "success": true,
    "matches": [{
        "id": "48a4fcee-1b02-4fa0-92c2-22c1213e7434",
	    "source": "embed text #1",
	    "metadata": {
            "userId": 1
        },
	    "score": 0.95,
    }]
}

```


### `POST /api/namespaces/`
**Create a namespace (a partition key within an index)**

**Request Body**

Example:
```
{
    "vectors": [{
        "text": "embed text #1",
        "metadata": '{"userId": 1}'
    }],
    "model": "text-embedding-3-large" 
}
```

Fields:
```
{
    vectors: { 
        text: string, 
        metadata: string (JSON-encoded object) [optional],
        id: string [optional, defaults to a UUID] 
    }[],
    model: string
}
```

**Returns**
```
{
    "vectors": [
        {
        "id": "48a4fcee-1b02-4fa0-92c2-22c1213e7434",
	    "source": "embed text #1",
	    "metadata": {"userId": 1},
	    "values": [0.015899453, 0.010525339, -0.016939605, ..., -0.025731359],
	    "model": "text-embedding-3-large"
        }
    ] 
}
```


### `GET /api/namespaces/`
**List namespaces**

**Query Params**:

- `offset: number` [optional, defaults to 0]
- `limit: number` [optional, defaults to 10]


**Returns**
```
{
    "namespaces": [
        {
            "id": "bb21cf54-e42d-4bf1-b188-804c0a883c6c",
            "name": "customers",
            "dimensionality": 1024,
            "distance": "cosine",
            "indexName": "synapse",
            "model": "text-embedding-3-large"
        },
        {
            ...
        }
    ]
}
```


### `GET /api/namespaces/:namespace/`
**Retrieve a namespace by name**

**Path Params**

- `namespace: string`: Name of the namespace to be retrieved

**Returns**
```
{
    "namespace": {
        "id": "bb21cf54-e42d-4bf1-b188-804c0a883c6c",
        "name": "customers",
        "dimensionality": 1024,
        "distance": "cosine",
        "indexName": "synapse",
        "model": "text-embedding-3-large"
    }
}
```



### `DELETE /api/namespaces/:namespace/`
**Delete a namespace by name**

**Path Params**

- `namespace: string`: Name of the namespace to be deleted

**Returns**

```
{
    "success": true
}
```

### `GET /api/namespaces/:namespace/vectors`
**List vectors associated with a given namespace**

**Path Params**

- `namespace: string`: Name of the namespace for which to retrieve vectors

**Returns**
```
{
    "vectors": [
        {
            "id": "48a4fcee-1b02-4fa0-92c2-22c1213e7434",
            "source": "embed text #1",
            "metadata": {"userId": 1},
            "values": [0.015899453, 0.010525339, -0.016939605, ..., -0.025731359],
            "model": "text-embedding-3-large"
        },
        {
            ...
        }
    ] 
}
```


### `GET /api/namespaces/:namespace/:vectorId/`
**Retrieve a specific vector in a given namespace**

**Path Params**

- `namespace: string`: Name of the namespace to be deleted
- `vectorId: string`: ID of the vector to be deleted

**Returns**
```
{
    "vector": {
        "id": "48a4fcee-1b02-4fa0-92c2-22c1213e7434",
        "source": "embed text #1",
        "metadata": {"userId": 1},
        "values": [0.015899453, 0.010525339, -0.016939605, ..., -0.025731359],
        "model": "text-embedding-3-large"
    }
}
```

### `DELETE /api/namespaces/:namespace/:vectorId/`
**Delete a vector in a given namespace**

**Path Params**

- `namespace: string`: Name of the namespace in which the vector to be deleted belongs
- `vectorId: string`: ID of the vector to be deleted

**Returns**

```
{
    "success": true
}
```


## OpenAI
By default, this project uses OpenAI's `text-embedding-3-large` model to embed the provided text. You may override this either by setting an alternative valid model name env 
`DEFAULT_OPENAI_EMBEDDING_MODEL` or when inserting an embedding vector.

You can only override the `model` request body param when inserting the very first vector into a namespace. Once a namespace has been created, the embedding model associated with the namespace becomes fixed. The rationale behind this is that the embeddings of particular model cannot be shared with the embeddings of anoher model - [see here](https://community.openai.com/t/are-embeddings-tied-to-a-particular-model/286394) for more info.
If you override the `model` request body param when inserting a vector, the **namespace** in which you are intending to insert the vecto

## Limitations


## Production
Access OpenAPI documentation at `/docs`.

## Local Development
1. Run `yarn dev` to start a local instance of the API.
2. Open `http://localhost:9000/` in your browser to see the Swagger interface where you can try the endpoints.
3. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.
