import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { Env } from '../env';
import { D1 } from "lib/d1";


export class NamespaceDelete extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "Delete a namespace by name",
		parameters: {
			namespace: Path(String, {
				description: "Namespace name",
			})
		},
		responses: {
			"200": {
				description: "Returns a boolean success value",
				schema: {
					success: Boolean
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

		const embeddingResults = await d1Client.listEmbeddingsByNamespace(
			namespace
		);
        const deletionIds: string[] = embeddingResults.map(o => o.vector_id as string);
		
        const [
            dbEmbeddingsDeletionResult, 
            vectorDeletionResult, 
            dbNamespaceDeletionResult 
        ] = await Promise.all([
            d1Client.deleteEmbeddingsByNamespace(namespace), 
            deletionIds ? env.VECTORIZE_INDEX.deleteByIds(deletionIds) : null,
			d1Client.deleteNamespaceByName(namespace)
        ]);
        return {
            success: vectorDeletionResult.count === deletionIds.length
        }
	}
}
