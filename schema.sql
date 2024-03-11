DROP TABLE IF EXISTS namespaces;
CREATE TABLE IF NOT EXISTS namespaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    model TEXT NOT NULL
);
CREATE INDEX namespaces_name_idx ON namespaces (name);
DROP TABLE IF EXISTS embeddings;
CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    namespace TEXT NOT NULL,
    vector_id TEXT NOT NULL UNIQUE
);
CREATE INDEX embeddings_namespace_vector_id_idx ON embeddings (namespace, vector_id);