interface QueryParams {
    filter?: string;
    fields?: string;
}

interface MongoQuery {
    $or?: Array<Record<string, any>>;
}

export class QueryHelper {
    /**
     * Construye una consulta MongoDB para búsqueda en múltiples campos
     * @param query Objeto con filter y fields
     * @returns Objeto de consulta MongoDB
     * 
     * Ejemplo de uso:
     * query = { filter: "john", fields: "name,email" }
     * Resultado = {
     *   $or: [
     *     { name: { $regex: /john/i } },
     *     { email: { $regex: /john/i } }
     *   ]
     * }
     */
    static async buildSearchQuery(query: QueryParams): Promise<MongoQuery> {
        try {
            // Si existen tanto filter como fields
            if (query.filter && query.fields) {
                // Crear estructura base de la consulta
                const searchQuery: MongoQuery = {
                    $or: []
                };

                // Dividir los campos en un array
                const fields = query.fields.split(',');

                // Crear condición de búsqueda para cada campo
                const searchConditions = fields.map(field => ({
                    [field]: {
                        $regex: new RegExp(query.filter as string, 'i')
                    }
                }));

                // Asignar las condiciones al $or
                searchQuery.$or = searchConditions;

                return searchQuery;
            }

            // Si no hay filtros, retornar objeto vacío
            return {};

        } catch (error) {
            throw new Error('Error al construir el filtro de búsqueda');
        }
    }
} 