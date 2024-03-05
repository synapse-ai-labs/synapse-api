import OpenAI, { NotFoundError as OpenAINotFoundError } from 'openai';

import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { VectorQueryBody, VectorMatch } from "../types";
import { Env } from '../env';
import { 
	CLOUDFLARE_ERROR_CODE_INSERT_VECTOR_INDEX_SIZE_MISMATCH
} from '../constants';
import {
	StatusCodes,
 } from 'http-status-codes';


export class VectorQuery extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Query"],
		summary: "Query vectors in a given namespace",
		requestBody: VectorQueryBody,
		parameters: {
			namespace: Path(String, {
				description: "Namespace name",
			}),
		},
		responses: {
			"200": {
				description: "Returns top matching vectors",
				schema: {
					success: Boolean,
					result: {
						matches: [VectorMatch],
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
        const { namespace } = data.params;
		const queryBody = data.body;

        const { results } = await env.DB.prepare(
            `SELECT * FROM namespaces WHERE name = ? LIMIT 1;`
        ).bind(namespace).all();
        if (results.length === 0) {
            return Response.json({
                error: `Cloudflare namespace ${namespace} does not exist.`
            });
        }
        const namespaceResult = results[0];
        
        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY
        });
        try {
            const { data: embeddingData } = await openai.embeddings.create(
				{
					input: queryBody.inputs,
					model: namespaceResult.model as string,
					dimensions: env.EMBEDDING_DIMENSIONALITY  // TODO: Might be possible to provide the developer with more granular control 
				}
			);
            const queryOpts = {
                namespace
            };
            const vectorizeQueryResult = await env.VECTORIZE_INDEX.query(
                embeddingData[0].embedding,
                queryOpts
            );
			const embeddingsQuery = `SELECT * FROM embeddings WHERE namespace = '${namespace}' AND vector_id IN (${vectorizeQueryResult.matches.map(o => `'${o.id}'`).join(',')})`;
			const { results } = await env.DB.prepare(
				embeddingsQuery
			).all();
			return {
				success: true,
				matches: vectorizeQueryResult.matches.map((o, i) => ({
					id: o.id,
					score: o.score,
					source: results.find(e => e.vector_id === o.id).source,
					metadata: o.metadata
				}))
			}
        } catch (err) {
			if (err instanceof OpenAINotFoundError) {
				return Response.json({ error: `OpenAI model not found` }, { status: StatusCodes.BAD_REQUEST });
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
