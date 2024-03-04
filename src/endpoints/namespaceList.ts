import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Query,
} from "@cloudflare/itty-router-openapi";
import { Namespace } from "../types";

import {QdrantClient} from '@qdrant/js-client-rest';

export class NamespaceList extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "List Namespaces",
		responses: {
			"200": {
				description: "Returns a list of namespaces",
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
		env: any,
		context: any,
		data: Record<string, any>
	) {
        const qdrantClient = new QdrantClient({
            url: env.QDRANT_URL,
            apiKey: env.QDRANT_API_KEY,
        });

        const qdrantResult = await qdrantClient.getCollections();
        console.log('List of collections:', qdrantResult.collections);

		// Implement your own object list here
		return {
			success: true,
			namespaces: qdrantResult.collections.map(o => {
                name: o.name
            })
		};
	}
}
