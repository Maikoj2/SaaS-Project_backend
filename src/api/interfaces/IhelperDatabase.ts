export interface FindOptions {
    deleted?: boolean;
    select?: string[];
    throwError?: boolean;
    errorMessage?: string;
}
export interface PopulateOptions {
    path: string;
    select?: string;
    populate?: PopulateOptions[];
}
export interface QueryOptions {
    select?: string | object;
    populate?: PopulateOptions | PopulateOptions[];
    lean?: boolean;
    sort?: object;
    page?: number;
    limit?: number;
    throwError?: boolean;
    errorMessage?: string;
}
export interface UpdateOptions extends FindOptions {
    new?: boolean;
    runValidators?: boolean;
}