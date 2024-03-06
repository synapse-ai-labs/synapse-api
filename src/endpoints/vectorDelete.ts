import {
	OpenAPIRoute,
	OpenAPIRouteSchema,
	Path
} from "@cloudflare/itty-router-openapi";
import { Env } from '../env';
import { D1 } from "lib/d1";


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

		const d1Client = new D1(env.DB);

        const [dbDeletionResults, vectorizeDeletionResults] = await Promise.all([
            d1Client.deleteEmbeddingsByVectorId(namespace, vectorId),
            env.VECTORIZE_INDEX.deleteByIds([vectorId])
        ]);
        return {
            success: vectorizeDeletionResults.count === 1
        }
	}
}
