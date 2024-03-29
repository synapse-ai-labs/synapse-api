import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
} from "@cloudflare/itty-router-openapi";
import { Namespace, VectorIndexConfigOverride } from "../types";

import { Env } from "env";
import { D1 } from "lib/d1";
import { INTERNAL_SERVER_ERROR, StatusCodes } from "http-status-codes";
import { STATUS_CODES } from "http";

export class NamespaceList extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "List Namespaces",
        parameters: {
			offset: Query(Number, {
				description: "Offset",
				default: '0',
				required: false
			}),
			limit: Query(Number, {
				description: "Number of results to return",
				default: '10',
				required: false
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
        const { offset, limit } = data.query;
		const d1Client = new D1(env.DB);

		const namespaceResults = await d1Client.listNamespaces(
			offset,
			limit
		);
		let namespaces;
		if (namespaceResults.length === 0) {
			namespaces = [];
		} else {
			const vectorIndexResult = await env.VECTORIZE_INDEX.describe();
			const vectorIndexConfig = vectorIndexResult.config as VectorIndexConfigOverride;
			namespaces = namespaceResults.map((o, i) => ({
				id: o.id,
				name: o.name,
				description: o.description,
				dimensionality: vectorIndexConfig.dimensions,
				distance: vectorIndexConfig.metric,
				indexName: vectorIndexResult.name,
				model: o.model
			}));
		}
		return {
			success: true,
			namespaces
		};
	}
}
