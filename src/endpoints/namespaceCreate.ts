import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
} from "@cloudflare/itty-router-openapi";
import { NamespaceBody, Namespace, VectorIndexConfigOverride } from "../types";
import { Env } from '../env';
import {
	StatusCodes,
 } from 'http-status-codes';
import { D1 } from "lib/d1";


export class NamespaceCreate extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "Create a namespace",
		requestBody: NamespaceBody,
		responses: {
			"200": {
				description: "Returns the created namespace",
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
		const namespaceToCreate = data.body; 
		const d1Client = new D1(env.DB);

		const existingNamespace = await d1Client.retrieveNamespace(
			namespaceToCreate.name
		);
		if (existingNamespace) {
			return Response.json({ error: `Namespace with name ${namespaceToCreate.name} already exists`}, {
				status: StatusCodes.BAD_REQUEST
			});
		} 
		let createdNamespace = await d1Client.createNamespace(
			namespaceToCreate.name,
			namespaceToCreate.model
		);
        if (!createdNamespace) {
            return Response.json({ 
                error: `Failed to create a Cloudflare namespace in your D1 database` 
            }, {
                status: StatusCodes.BAD_REQUEST
            });
        }
		const vectorIndexResult = await env.VECTORIZE_INDEX.describe();
		const vectorIndexConfig = vectorIndexResult.config as VectorIndexConfigOverride;
        return {
            success: true,
            namespace: {
                id: createdNamespace.id,
                name: createdNamespace.name,
                description: vectorIndexResult.description,
                dimensionality: vectorIndexConfig.dimensions,
                distance: vectorIndexConfig.metric,
                indexName: vectorIndexResult.name,
                model: createdNamespace.model
            },
        };
	}
}
