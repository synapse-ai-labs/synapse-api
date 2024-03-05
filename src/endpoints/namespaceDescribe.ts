import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
    Path
} from "@cloudflare/itty-router-openapi";
import { Namespace, VectorIndexConfigOverride } from "../types";

import { Env } from "index";

export class NamespaceDescribe extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespace"],
		summary: "Retrieve Namespace",
		responses: {
			"200": {
				description: "Describes the index namespace",
				schema: {
					success: Boolean,
					result: {
						namespace: Namespace,
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
        const result = await env.VECTORIZE_INDEX.describe();
		const config = result.config as VectorIndexConfigOverride;
		return {
			success: true,
			namespace: {
				id: result.id,
				name: result.name,
				description: result.description,
				dimensionality: config.dimensions,
				distance: config.metric,
				vectorsCount: result.vectorsCount
			}
		};
	}
}
