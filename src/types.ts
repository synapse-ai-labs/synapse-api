import { Str, Enumeration } from "@cloudflare/itty-router-openapi";
import { OPENAI_EMBEDDING_MODELS, OPENAI_EMBEDDING_MODEL_LARGE } from "./constants";
import {z} from 'zod';

export const Metadata = z.record(z.string(), z.any(), { description: 'Custom vector metadata'}).optional();
export const Model = new Enumeration({ 
	required: false, 
	values: OPENAI_EMBEDDING_MODELS, 
	default: OPENAI_EMBEDDING_MODEL_LARGE 
});


export enum Distance {
	Dot = "Dot",
	Cosine = "Cosine",
	Euclid = "Euclid",
	Manhattan = "Manhattan"
};

export const Namespace = {
	id: String,
	name: z.string().max(5), // new Str({ example: "embeddings", required: true, }),
	description: String,
	dimensionality: Number,
	distance: Distance,
	indexName: String,
	model: Model
};

export const NamespaceBody = {
	name: z.string().min(1).max(63).default('example_namespace_name'),
	model: Model,
	description: new Str({ example: "all customers", required: false, default: ''})
};


export const VectorBody = {
	id: new Str({ required: false, description: 'Optional (UUID generated if not provided)', example: '123'}),
	text: new Str({ required: true, example: 'embedded text example'}),
	metadata: Metadata,
};

export const MultiVectorBody = {
	vectors: [VectorBody],
	model: Model
}; 

export const Vector = {
	id: String,
	source: String,
	metadata: Metadata,
	values: [Number],
	model: Model
};

export declare type VectorIndexConfigOverride = {
	dimensions: number;
	metric: VectorizeDistanceMetric;
};

export const VectorQueryBody = {
	inputs: new Str({ required: true, example: 'query test'})
};

export const VectorMatch = {
	id: String,
	source: String,
	metadata: Metadata,
	score: Number,
	values: [Number]
}