import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
    Path,
	Str
} from "@cloudflare/itty-router-openapi";
import { Namespace, VectorIndexConfigOverride } from "../types";

import { Env } from "env";
import { StatusCodes } from "http-status-codes";

export class NamespaceFetch extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespace"],
		summary: "Retrieve a namespace by name",
		parameters: {
			namespace: Path(String, {
				description: "Name of the namespace"
			})
		},
		responses: {
			"200": {
				description: "Retrieve a namespace",
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
		const { namespace } = data.params;

		const { results: namespaceResults } = await env.DB.prepare(
			"SELECT * FROM namespaces WHERE name = ?"
		).bind(namespace).all();
		if (namespaceResults.length === 0) {
			return Response.json({ error: `Namespace with name ${namespace} not found`}, { status: StatusCodes.NOT_FOUND});
		}
		const namespaceResult = namespaceResults[0];
		const vectorIndexResult = await env.VECTORIZE_INDEX.describe();
		const vectorIndexConfig = vectorIndexResult.config as VectorIndexConfigOverride;

		return {
			success: true,
			namespace: {
				id: namespaceResult.id,
				name: namespaceResult.name,
				description: vectorIndexResult.description,
				dimensionality: vectorIndexConfig.dimensions,
				distance: vectorIndexConfig.metric,
				indexName: vectorIndexResult.name,
				embeddingModel: namespaceResult.model
			}
		};
	}
}
