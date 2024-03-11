const INSERT_NAMESPACE_SQL = `INSERT INTO namespaces (name, model) VALUES (?, ?) RETURNING *;`;
const RETRIEVE_NAMESPACE_SQL = `SELECT * FROM namespaces WHERE name = ?;`
const LIST_NAMESPACES_SQL = `SELECT * FROM namespaces LIMIT ? OFFSET ?;`;
const LIST_EMBEDDINGS_BY_NAMESPACE_SQL = `SELECT * FROM embeddings WHERE namespace = ?;`;
const LIST_EMBEDDINGS_BY_NAMESPACE_PAGINATED_SQL = `SELECT * FROM embeddings WHERE namespace = ? LIMIT ? OFFSET ?;`;
const DELETE_EMBEDDINGS_BY_NAMESPACE_SQL = `DELETE FROM embeddings WHERE namespace = ?;`;
const DELETE_NAMESPACE_BY_NAME_SQL = `DELETE FROM namespaces WHERE name = ?`;
const INSERT_EMBEDDING_SQL = `INSERT INTO embeddings (source, namespace, vector_id) VALUES (?, ?, ?) ON CONFLICT (vector_id) DO UPDATE SET source = EXCLUDED.source;`;
const DELETE_EMBEDDINGS_BY_VECTOR_ID_SQL = `DELETE FROM embeddings WHERE namespace = ? AND vector_id = ? RETURNING *;`;
const RETRIEVE_EMBEDDING_SQL = `SELECT * FROM embeddings WHERE namespace = ? AND vector_id = ? LIMIT 1;`;
const LIST_EMBEDDINGS_BY_VECTOR_IDS_SQL = `SELECT * FROM embeddings WHERE namespace = ? AND vector_id IN (?)`;

export interface EmbeddingInsert {
    text: string;
    namespace: string;
    vectorId: string
};

export class D1 {

    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async createNamespace(name: string, model: string, description?: string) {
        const { results } = await this.db.prepare(
            INSERT_NAMESPACE_SQL
        ).bind(
            name,
            model
        ).all()
        return results.length === 1 ? results[0] : null;
    }

    async retrieveNamespace(name: string) {
        const { results } = await this.db.prepare(
            RETRIEVE_NAMESPACE_SQL
        ).bind(
            name
        ).all();
        return results.length === 1 ? results[0] : null;
    }
    
    async listNamespaces(offset: number = 0, limit: number = 10) {
        const { results } = await this.db.prepare(
            LIST_NAMESPACES_SQL
        ).bind(
            limit,
            offset
        ).all();
        return results;
    }

    async listEmbeddingsByNamespace(namespace: string) {
        const { results } = await this.db.prepare(
            LIST_EMBEDDINGS_BY_NAMESPACE_SQL
        ).bind(
            namespace
        ).all();
        return results;
    }

    async listEmbeddingsByVectorIds(namespace: string, vectorIds: string[]) {
        const { results } = await this.db.prepare(
            LIST_EMBEDDINGS_BY_VECTOR_IDS_SQL
        ).bind(
            namespace,
            vectorIds.map(o => `${o}`).join(',')
        ).all();
        return results;
    }

    async listEmbeddingsByNamespacePaginated(namespace: string, offset: number = 0, limit: number = 10, ) {
        const { results } = await this.db.prepare(
            LIST_EMBEDDINGS_BY_NAMESPACE_PAGINATED_SQL
        ).bind(
            namespace,
            limit,
            offset
        ).all();
        return results;
    }

    async deleteEmbeddingsByNamespace(namespace: string) {
        return await this.db.prepare(
            DELETE_EMBEDDINGS_BY_NAMESPACE_SQL
        ).bind(
            namespace
        ).run();
    }

    async retrieveEmbeddingByVectorId(namespace: string, vectorId: string) {
        const { results } = await this.db.prepare(
            RETRIEVE_EMBEDDING_SQL
        ).bind(
            namespace,
            vectorId
        ).all();
        return results.length === 1 ? results[0] : null;
    }

    async deleteEmbeddingsByVectorId(namespace: string, vectorId: string) {
        return await this.db.prepare(
            DELETE_EMBEDDINGS_BY_VECTOR_ID_SQL
        ).bind(
            namespace,
            vectorId
        ).run();
    }

    async deleteNamespaceByName(name: string) {
        return await this.db.prepare(
            DELETE_NAMESPACE_BY_NAME_SQL
        ).bind(
            name
        ).run();
    }

    async bulkEmbeddingsInsert(data: EmbeddingInsert[]) {
        const d1Inserts = data.map((o, i) => {
            return this.db.prepare(INSERT_EMBEDDING_SQL).bind(
                o.text,
                o.namespace,
                o.vectorId
            )
        });
		return await this.db.batch(d1Inserts);
    }
}