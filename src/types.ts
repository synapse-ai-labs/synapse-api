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
	id: String,
	name: new Str({ example: "embeddings"}),
	description: String,
	dimensionality: Number,
	distance: Distance,
	vectorsCount: Number
};

export const VectorBody = {
	id: new Str({ required: false}),
	text: String,
	metadata: {},
};

export const MultiVectorBody = {
	vectors: [VectorBody]
}; 

export const Vector = {
	id: String,
	source: String,
	metadata: {},
	values: [Number],
};

export declare type VectorIndexConfigOverride = {
	dimensions: number;
	metric: VectorizeDistanceMetric;
};