import OpenAI, { NotFoundError as OpenAINotFoundError } from 'openai';

import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { MultiVectorBody, Vector } from "../types";
import { Env } from '../env';
import { uuid } from '@cfworker/uuid';
import { 
	CLOUDFLARE_ERROR_CODE_INSERT_VECTOR_INDEX_SIZE_MISMATCH, 
	DEFAULT_OPENAI_EMBEDDING_MODEL 
} from '../constants';
import {
	StatusCodes,
 } from 'http-status-codes';


export class VectorCreate extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Vectors"],
		summary: "Embed and insert a new vector into a namespace",
		requestBody: MultiVectorBody,
		parameters: {
			namespace: Path(String, {
				description: "Namespace name",
			}),
		},
		responses: {
			"200": {
				description: "Returns the created vector",
				schema: {
					success: Boolean,
					result: {
						vectors: [Vector],
					},
				},
			},
		},
	};

	async createNamespace(namespace: string, model: string, env: Env) {
		const embeddingsInsertSql = `INSERT INTO namespaces (name, model) VALUES (?, ?) RETURNING *;`; 
		const { results } = await env.DB.prepare(
			embeddingsInsertSql
		).bind(namespace, model).all();
		return results;
	};

	async getNamespace(namespace: string, env: Env) {
		const { results } = await env.DB.prepare(
			`SELECT * FROM namespaces WHERE name = ?;`,
		).bind(namespace).all();
		return results;
	}

	async handle(
		request: Request,
		env: Env,
		context: any,
		data: Record<string, any>
	) {
		const vectorsToCreate = data.body;
		const parsedData = vectorsToCreate.vectors.map(o => {
			return {
				...o,
				id: o.id ?? uuid(), 
				metadata: o.metadata ? JSON.parse(o.metadata) : {},
			}
		});
		const { namespace } = data.params;

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
		const model = vectorsToCreate.model ?? DEFAULT_OPENAI_EMBEDDING_MODEL;
		try {
			let namespaceResults = await this.getNamespace(
				namespace,
				env
			);
			if (namespaceResults.length === 0) {
				namespaceResults = await this.createNamespace(namespace, model, env);
			}
			if (namespaceResults.length === 0) {
				return Response.json({ 
					error: `Failed to create a Cloudflare namespace in your D1 database` 
				}, {
					status: StatusCodes.BAD_REQUEST
				});
			}
			const namespaceData = namespaceResults[0];

			const { data: embeddingData } = await openai.embeddings.create(
				{
					input: parsedData.map(o => o.text),
					model: namespaceData.model as string,
					dimensions: env.EMBEDDING_DIMENSIONALITY
				}
			);
			// map ids to positional indexes
			const mapped = parsedData.reduce((acc, { id }, idx) => {
				acc[id] = idx;
				return acc;
			}, {});

			const insertionData: VectorizeVector[] = embeddingData.map((o, i) => ({
				id: parsedData[i].id,
				values: o.embedding,
				namespace,
				metadata: parsedData[i].metadata,
			}));
			const insertionSql = `INSERT INTO embeddings (source, namespace, vector_id) VALUES (?, ?, ?) ON CONFLICT (vector_id) DO UPDATE SET source = EXCLUDED.source;`;
			const d1Inserts = insertionData.map((o, i) => {
				return env.DB.prepare(insertionSql).bind(
					parsedData[i].text,
					namespace,
					parsedData[i].id
				)
			});
			const vectorizeResult = await env.VECTORIZE_INDEX.insert(insertionData);
			await env.DB.batch(d1Inserts);
			return {
				success: true,
				vectors: vectorizeResult.ids.map((id, i) => ({
					id: id,
					source: parsedData.find(o => o.id === id).text,
					values: embeddingData[mapped[id]].embedding,
					metadata: parsedData[mapped[id]].metadata
				})),
			};
		} catch (err) {
			console.log({errorOccurred: err});
			if (err instanceof OpenAINotFoundError) {
				return Response.json({ error: `OpenAI model '${model}' not found` }, { status: StatusCodes.BAD_REQUEST });
			}
			const vectorInsertRegex = /^VECTOR_INSERT_ERROR \(code = (\d+)\)/;
			const vectorInsertMatches = err.message.match(vectorInsertRegex);
			if (vectorInsertMatches) {
				const errorCode = parseInt(vectorInsertMatches[1]);
				if (errorCode === CLOUDFLARE_ERROR_CODE_INSERT_VECTOR_INDEX_SIZE_MISMATCH) {
					return Response.json(
						{ 
							error: err.message, 
							suggestion: `You either need to change the environment variable set for EMBEDDING_DIMENSIONALITY in the wranger.toml file OR drop and recreate the Cloudflare Vectorize Index with the desired dimensionality.`
						},
						{
							status: StatusCodes.BAD_REQUEST
						}
					);
				}
			} else {
				return Response.json({ error: err.message }, { status: StatusCodes.BAD_REQUEST });
			}
			throw err;
		}
	}
}
