import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
} from "@cloudflare/itty-router-openapi";
import { Namespace, VectorIndexConfigOverride } from "../types";

import { Env } from "env";

export class NamespaceList extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "List Namespaces",
        parameters: {
			page: Query(Number, {
				description: "Page number",
				default: 1,
				required: false
			}),
			limit: Query(Number, {
				description: "Number of results to return per page",
				required: false,
                default: 10,
			}),
		},
		responses: {
			"200": {
				description: "Returns a list of namespace records",
				schema: {
					success: Boolean,
					result: {
						namespaces: [Namespace],
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
        const { results: namespaceResults } = await env.DB.prepare(
            "SELECT * FROM namespaces LIMIT ? OFFSET ?;"
        ).bind(limit, offset).all(); 

        let namespaces;
        if (namespaceResults.length === 0) {
            namespaces = [];
        } else {
            const vectorIndexResult = await env.VECTORIZE_INDEX.describe();
            const vectorIndexConfig = vectorIndexResult.config as VectorIndexConfigOverride;
            namespaces = namespaceResults.map((o, i) => ({
                id: o.id,
                name: o.name,
                description: vectorIndexResult.description,
                dimensionality: vectorIndexConfig.dimensions,
                distance: vectorIndexConfig.metric,
                indexName: vectorIndexResult.name,
                embeddingModel: o.model
            }));
        }
		return {
			success: true,
			namespaces
		};
	}
}
