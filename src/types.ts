import { DateTime, Obj, Str } from "@cloudflare/itty-router-openapi";


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
	indexName: String,
	model: String
};

export const NamespaceBody = {
	name: new Str({ example: "customers",  required: true}),
	model: String,
	description: new Str({ example: "all customers", required: false, default: ''})
};


export const VectorBody = {
	id: new Str({ required: false }),
	text: String,
	metadata: new Str({ required: false}),
};

export const MultiVectorBody = {
	vectors: [VectorBody],
	model: new Str({ required: false })
}; 

export const Vector = {
	id: String,
	source: String,
	metadata: Obj,
	values: [Number],
	model: new Str({ required: false})
};

export declare type VectorIndexConfigOverride = {
	dimensions: number;
	metric: VectorizeDistanceMetric;
};

export const VectorQueryBody = {
	inputs: String
};

export const VectorMatch = {
	id: String,
	source: String,
	metadata: new Obj({ required: false }),
	score: Number,
	values: [Number]
}