import OpenAI from 'openai';

import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path,
} from "@cloudflare/itty-router-openapi";
import { MultiVectorBody, Vector, VectorBody } from "../types";
import { Env } from 'index';

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
		// Retrieve the validated request body
		const vectorsToCreate = data.body;
		const parsedData = vectorsToCreate.vectors.map(o => {
			return {
				...o,
				metadata: o.metadata ? JSON.parse(o.metadata) : {},
			}
		});
		const { namespace } = data.params;

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY, // This is the default and can be omitted
        });
        const { data: embeddingData } = await openai.embeddings.create(
            {
                input: parsedData.map(o => o.text),
                model: 'text-embedding-3-large',
                dimensions: 1024
            }
        );
		// need to map ids to indexes
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
		const insertedVectors = await env.VECTORIZE_INDEX.insert(insertionData);
		return {
			success: true,
			vectors: insertedVectors.ids.map(id => ({
				id,
				source: parsedData.find(o => o.id === id).text,
				values: embeddingData[mapped[id]].embedding,
				metadata: parsedData[mapped[id]].metadata
			})),
		};
	}
}
