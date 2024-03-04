import { DateTime, Str } from "@cloudflare/itty-router-openapi";

export const Task = {
	name: new Str({ example: "lorem" }),
	slug: String,
	description: new Str({ required: false }),
	completed: Boolean,
	due_date: new DateTime(),
};

export enum Distance {
	Dot = "Dot",
	Cosine = "Cosine",
	Euclid = "Euclid",
	Manhattan = "Manhattan"
};

export const Namespace = {
	name: new Str({ example: "my_vector_store"}),
	dimensionality: Number,
	distance: Distance,
	shardNumber: Number,
	replicationFactor: Number,
	writeConsistencyFactor: Number,
	vectorsCount: Number,
	pointsCount: Number
};