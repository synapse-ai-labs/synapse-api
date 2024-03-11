import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
    Path
} from "@cloudflare/itty-router-openapi";
import { Namespace, VectorIndexConfigOverride } from "../types";

import { Env } from "env";
import { StatusCodes } from "http-status-codes";
import { D1 } from "lib/d1";

export class NamespaceFetch extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
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

		const d1Client = new D1(env.DB);

		const namespaceResult = await d1Client.retrieveNamespace(
			namespace
		);
		if (!namespaceResult) {
			return Response.json({ error: `Namespace with name ${namespace} not found`}, { status: StatusCodes.NOT_FOUND});
		}
		
		const vectorIndexResult = await env.VECTORIZE_INDEX.describe();
		const vectorIndexConfig = vectorIndexResult.config as VectorIndexConfigOverride;
		return {
			success: true,
			namespace: {
				id: namespaceResult.id,
				name: namespaceResult.name,
				description: namespaceResult.description,
				dimensionality: vectorIndexConfig.dimensions,
				distance: vectorIndexConfig.metric,
				indexName: vectorIndexResult.name,
				model: namespaceResult.model
			}
		};
	}
}
