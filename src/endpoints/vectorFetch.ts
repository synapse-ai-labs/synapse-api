import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path,
} from "@cloudflare/itty-router-openapi";
import { Vector } from "../types";

import { Env } from "env";

export class VectorFetch extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Vectors"],
		summary: "Retrieve a vector by namespsace and vector ID",
        parameters: {
			namespace: Path(String, {
				description: "Name of the vector index namespace",
			}),
			vectorId: Path(String, {
				description: "Unique ID of the vector in the given namespace",
			}),
		},
		responses: {
			"200": {
				description: "Returns a single vector",
				schema: {
					success: Boolean,
					result: {
						vector: Vector,
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
        const { namespace, vectorId } = data.params;
        
        const vectorResults = await env.VECTORIZE_INDEX.getByIds(
            [vectorId]
        )
        if (vectorResults.length === 0) {
            return Response.json({ error: `Vector not found for vectorId '${vectorId}`});
        }
        const vectorResult = vectorResults[0];
        const { results: embeddingsResults } = await env.DB.prepare(
            "SELECT * FROM embeddings WHERE namespace = ? AND vector_id = ? LIMIT 1;"
        ).bind(namespace, vectorResult.id).all();
        const embeddingResult = embeddingsResults[0];
        
        const { results: namespaceResults } = await env.DB.prepare(
            "SELECT * FROM namespaces WHERE name = ? LIMIT 1;"
        ).bind(namespace).all();
        const namespaceResult = namespaceResults[0];

        const vector = {
            id: vectorResult.id,
            source: embeddingResult.source,
            metadata: embeddingResult.metadata,
            values: vectorResult.values,
            model: namespaceResult.model
        };
		return {
			success: true,
			vector
		};
	}
}
