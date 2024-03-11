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
	CLOUDFLARE_ERROR_CODE_INSERT_VECTOR_INDEX_SIZE_MISMATCH
} from '../constants';
import {
	StatusCodes,
 } from 'http-status-codes';
import { D1 } from 'lib/d1';


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

		const d1Client = new D1(env.DB);

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
		const modelParam = vectorsToCreate.model ?? env.DEFAULT_OPENAI_EMBEDDING_MODEL;
		try {
			let namespaceData = await d1Client.retrieveNamespace(
				namespace
			);
			if (!namespaceData) {
				namespaceData = await d1Client.createNamespace(namespace, modelParam);
			}
			if (!namespaceData) {
				return Response.json({ 
					error: `Failed to create a Cloudflare namespace in your D1 database` 
				}, {
					status: StatusCodes.BAD_REQUEST
				});
			}

			if (namespaceData.model !== modelParam) {
				return Response.json({
					error: `The specified namespace is already bound to the embedding model ${namespaceData.model}. 
					Remove the "model" param from your request body or change it to "${namespaceData.model}"`
				}, { status: StatusCodes.BAD_REQUEST});
			}

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
			const vectorizeResult = await env.VECTORIZE_INDEX.insert(insertionData);
			await d1Client.bulkEmbeddingsInsert(
				insertionData.map((o, i) => ({
					text: parsedData[i].text,
					namespace,
					vectorId: parsedData[i].id
				}))
			);
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
			if (err instanceof OpenAINotFoundError) {
				return Response.json({ error: `OpenAI model '${modelParam}' not found` }, { status: StatusCodes.BAD_REQUEST });
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
