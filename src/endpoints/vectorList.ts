import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
	Path,
} from "@cloudflare/itty-router-openapi";
import { Vector } from "../types";

import { Env } from "env";
import { D1 } from "lib/d1";

export class VectorsList extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Vectors"],
		summary: "List Vectors",
        parameters: {
			namespace: Path(String, {
				description: "Name of the namespace for which to list vectors",
				required: true
			}),
			offset: Query(Number, {
				description: "Offset",
				default: 0,
				required: false
			}),
			limit: Query(Number, {
				description: "Number of results to return",
				required: false,
                default: 10,
			}),
			returnValues: Query(Boolean, {
				description: "Return vector values",
				default: false,
				required: false
			}),
			returnMetadata: Query(Boolean, {
				description: "Return vector metadata",
				default: false,
				required: false
			}) 
		},
		responses: {
			"200": {
				description: "Returns a list of vector records",
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
        const { offset, limit, returnMetadata, returnValues } = data.query;
		
		const { namespace } = data.params;

		const d1Client = new D1(env.DB);

		const results = await d1Client.listEmbeddingsByNamespacePaginated(
			namespace,
			limit,
			offset
		);

		const namespaceData = await d1Client.retrieveNamespace(
			namespace	
		);
		const vectorIds: string[] = results.map(o => o.vector_id as string);
		const vectorResults = await env.VECTORIZE_INDEX.getByIds(
			vectorIds
		);
		return {
			success: true,
			vectors: results.map((o) => {
				const matchingVector = vectorResults.find(v => v.id === o.vector_id);
				return {
					id: o.vector_id,
					source: o.source,
					values: returnValues ? matchingVector.values : undefined,
					metadata: returnMetadata ? matchingVector.metadata : undefined,
					model: namespaceData.model
				}
            })
		};
	}
}
