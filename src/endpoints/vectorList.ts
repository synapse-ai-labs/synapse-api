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
			namespace: Path(String, {
				description: "Name of the namespace for which to list vectors",
				required: true
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
        const { offset, limit } = data.query;
		
		const { namespace } = data.params;

		const d1Client = new D1(env.DB);

		const results = await d1Client.listEmbeddingsByNamespacePaginated(
			namespace,
			limit,
			offset
		);
		return {
			success: true,
			vectors: results.map((o) => ({
                id: o.id,
				source: o.source
            }))
		};
	}
}
