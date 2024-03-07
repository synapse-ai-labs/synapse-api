import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { NamespaceFetch } from "./endpoints/namespaceFetch";
import { NamespaceDelete } from "./endpoints/namespaceDelete";
import { VectorsList } from "./endpoints/vectorList";
import { VectorCreate } from "./endpoints/vectorCreate";
import { VectorQuery } from "./endpoints/vectorQuery";
import { VectorFetch } from "./endpoints/vectorFetch";
import { VectorDelete } from "./endpoints/vectorDelete";
import { NamespaceList } from "./endpoints/namespaceList";
import { NamespaceCreate } from "endpoints/namespaceCreate";
import { Env } from "env";
import { StatusCodes } from "http-status-codes";

export interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

export const router = OpenAPIRouter({
	docs_url: "/docs",
});


router.post("/api/namespaces/:namespace/query", VectorQuery);
router.post("/api/namespaces/:namespace/insert", VectorCreate);
router.post("/api/namespaces/", NamespaceCreate);
router.get("/api/namespaces/", NamespaceList);
router.get("/api/namespaces/:namespace/", NamespaceFetch);
router.delete("/api/namespaces/:namespace/", NamespaceDelete);
router.get("/api/namespaces/:namespace/vectors", VectorsList);
router.get("/api/namespaces/:namespace/:vectorId/", VectorFetch);
router.delete("/api/namespaces/:namespace/:vectorId/", VectorDelete)


// 404 for everything else
router.all("*", () =>
	Response.json(
		{
			success: false,
			error: "Route not found",
		},
		{ status: 404 }
	)
);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.handle(request, env, ctx).catch((err) => {
			return Response.json({ error: err.message }, { status: StatusCodes.INTERNAL_SERVER_ERROR});
		});
	}
};
