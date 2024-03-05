import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
} from "@cloudflare/itty-router-openapi";
import { Vector } from "../types";

import { Env } from "index";

export class VectorsList extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Vectors"],
		summary: "List Vectors",
        parameters: {
			page: Query(Number, {
				description: "Page number",
				default: 0,
			}),
			limit: Query(Number, {
				description: "Number of results to return per page",
				required: false,
                default: 10,
			}),
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
        const { page, limit } = data.query;
        const offset = (page - 1) * limit;
        const { results } = await env.DB.prepare(
            "SELECT * FROM embeddings LIMIT ? OFFSET ?;"
        ).bind(limit, offset).all(); 
		return {
			success: true,
			vectors: results.map((o) => ({
                id: o.id,
				source: o.source
            }))
		};
	}
}
