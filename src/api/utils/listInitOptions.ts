import { IUserCustomRequest } from "../interfaces";

// private methods
export const listInitOptions = (req: IUserCustomRequest) => {
    const order = parseInt(req.query.order?.toString() || '-1', 10);
    const sort = req.query.sort?.toString() || 'createdAt';
    const sortBy = buildSort(sort, order);
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '15', 10);

    return {
        sort: sortBy,
        lean: true,
        page,
        limit
    };
};
const buildSort = (sort: string, order: number): Record<string, 1 | -1> => {
    const sortBy: Record<string, 1 | -1> = {};
    sortBy[sort] = order === 1 ? 1 : -1;
    return sortBy;
};
