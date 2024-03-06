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

export interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

export const router = OpenAPIRouter({
	docs_url: "/",
});

router.post("/api/namespaces/:namespace/query", VectorQuery);
router.post("/api/namespaces/", NamespaceCreate);
router.get("/api/namespaces/", NamespaceList);
router.get("/api/namespaces/:namespace/", NamespaceFetch);
router.delete("/api/namespaces/:namespace/", NamespaceDelete);
router.get("/api/vectors", VectorsList);
router.post("/api/vectors/:namespace/", VectorCreate);
router.get("/api/vectors/:namespace/:vectorId/", VectorFetch);
router.delete("/api/vectors/:namespace/:vectorId/", VectorDelete);


// 404 for everything else
router.all("*", () =>
	Response.json(
		{
			success: false,
			error: "Route not found??",
		},
		{ status: 404 }
	)
);

export default {
	fetch: router.handle,
};
