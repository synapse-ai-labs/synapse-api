import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { Env } from '../env';


export class NamespaceDelete extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Namespaces"],
		summary: "Delete a namespace",
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

        const { results: deletionIdsResults } = await env.DB.prepare(
            "SELECT vector_id FROM embeddings WHERE namespace = ?;"
        ).bind(namespace).all();
        const deletionIds: string[] = deletionIdsResults.map(o => o.vector_id as string);
        const [
            dbEmbeddingsDeletionResult, 
            vectorDeletionResult, 
            dbNamespaceDeletionResult 
        ] = await Promise.all([
            env.DB.prepare("DELETE FROM embeddings WHERE namespace = ?;").bind(namespace).run(), 
            deletionIds ? env.VECTORIZE_INDEX.deleteByIds(deletionIds) : null,
            env.DB.prepare("DELETE FROM namespaces WHERE name = ?").bind(namespace).run()
        ]);
        return {
            success: vectorDeletionResult.count === deletionIds.length
        }
	}
}
