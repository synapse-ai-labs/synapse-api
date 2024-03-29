export interface Env {
	VECTORIZE_INDEX: VectorizeIndex;
	OPENAI_API_KEY: string;
	DB: D1Database;
	EMBEDDING_DIMENSIONALITY: number;
	DEFAULT_OPENAI_EMBEDDING_MODEL: string;
}
