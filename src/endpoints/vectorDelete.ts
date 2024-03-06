import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { Env } from '../env';


export class VectorDelete extends OpenAPIRoute {
	static schema: OpenAPIRouteSchema = {
		tags: ["Vectors"],
		summary: "Delete a vector from a namespace",
		parameters: {
			namespace: Path(String, {
				description: "Namespace name",
			}),
            vectorId: Path(String, {
                description: "Vector ID"
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
        const { namespace, vectorId} = data.params;
        const [dbDeletionResults, vectorizeDeletionResults] = await Promise.all([
            env.DB.prepare(
                "DELETE FROM embeddings WHERE namespace = ? AND vector_id = ? RETURNING *;"
            ).bind(namespace, vectorId).run(),
            env.VECTORIZE_INDEX.deleteByIds([vectorId])
        ]);
        console.log({dbDeletionResults});
        return {
            success: vectorizeDeletionResults.count === 1
        }
	}
}
