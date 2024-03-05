import OpenAI from 'openai';

import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path,
} from "@cloudflare/itty-router-openapi";
import { MultiVectorBody, Vector, VectorBody } from "../types";
import { Env } from 'index';
import { uuid } from '@cfworker/uuid';

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
				id: o.id ?? uuid(), 
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
		const insertionSql = `
            INSERT INTO embeddings (source, namespace, vector_id) 
            VALUES (?, ?, ?) 
            ON CONFLICT (vector_id) DO UPDATE SET source = EXCLUDED.source;
        `;
		const d1Inserts = insertionData.map((o, i) => {
			return env.DB.prepare(insertionSql).bind(
				parsedData[i].text,
				namespace,
				parsedData[i].id
			)
		});
		const [_, vectorizeResult] = await Promise.all([env.DB.batch(d1Inserts), env.VECTORIZE_INDEX.insert(insertionData)]);
		return {
			success: true,
			vectors: vectorizeResult.ids.map((id, i) => ({
				id: id,
				source: parsedData.find(o => o.id === id).text,
				values: embeddingData[mapped[id]].embedding,
				metadata: parsedData[mapped[id]].metadata
			})),
		};
	}
}
