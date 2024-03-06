import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path,
} from "@cloudflare/itty-router-openapi";
import { Vector } from "../types";

import { Env } from "env";
import { D1 } from "lib/d1";

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

		const d1Client = new D1(env.DB);
		const embeddingResult = await d1Client.retrieveEmbeddingByVectorId(
			namespace,
			vectorResult.id
		);

		const namespaceResult = await d1Client.retrieveNamespace(
			namespace
		);
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
