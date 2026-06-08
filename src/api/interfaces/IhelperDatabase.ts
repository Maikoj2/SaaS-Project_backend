export type SelectOption = string | string[] | Record<string, number | boolean>;

export interface FindOptions {
    deleted?: boolean;
    select?: SelectOption;
    throwError?: boolean;
    errorMessage?: string;
}

export interface PopulateOptions {
    path: string;
    select?: string; // Por lo general, en populate es más común una cadena o arreglo
    populate?: PopulateOptions[];
}

export interface QueryOptions {
    select?: SelectOption;
    populate?: PopulateOptions | PopulateOptions[];
    lean?: boolean;
    sort?: object;
    page?: number;
    limit?: number;
    throwError?: boolean;
    errorMessage?: string;
}

export interface UpdateOptions extends FindOptions, QueryOptions {
    new?: boolean;
    runValidators?: boolean;
}
