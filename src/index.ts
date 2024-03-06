import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskFetch } from "./endpoints/taskFetch";
import { TaskList } from "./endpoints/taskList";
import { NamespaceFetch } from "./endpoints/namespaceFetch";
import { VectorsList } from "./endpoints/vectorList";
import { VectorCreate } from "./endpoints/vectorCreate";
import { VectorQuery } from "./endpoints/vectorQuery";
import { VectorFetch } from "./endpoints/vectorFetch";

export interface EmbeddingResponse {
	shape: number[];
	data: number[][];
}

export const router = OpenAPIRouter({
	docs_url: "/",
});

router.post("/api/namespace/:namespace/query", VectorQuery);
router.get("/api/namespace/:namespace/", NamespaceFetch);
router.get("/api/vectors", VectorsList);
router.post("/api/vectors/:namespace/", VectorCreate);
router.get("/api/vectors/:namespace/:vectorId/", VectorFetch);


router.get("/api/tasks/", TaskList);
router.post("/api/tasks/", TaskCreate);
router.get("/api/tasks/:taskSlug/", TaskFetch);
router.delete("/api/tasks/:taskSlug/", TaskDelete);

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
