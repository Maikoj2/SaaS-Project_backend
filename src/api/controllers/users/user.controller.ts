import { Request, Response } from 'express';
import { UserService } from "../../services/user/user.service";
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { Logger } from '../../config';




export class UserController {
    private readonly userService: UserService;
    private readonly logger: Logger;

    constructor() {
        this.userService = new UserService();
        this.logger = new Logger();
    }
    public getUsers = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const options = this.listInitOptions(req);            
            const user = await this.userService.getUsers( tenant, options);
        
            res.status(200).json(
                ApiResponse.success(user, 'Users retrieved successfully')
            );
        } catch (error) {
            this.logger.error('Error getting users:', error);
            res.status(500).json(
                ApiResponse.error('Error retrieving users')
            );
        }
    }

    public async getUserById(req: IUserCustomRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount;

            // const user = await this.userService.getUserById(id, tenant);
            res.status(200).json(ApiResponse.success(null, 'User fetched successfully'));
        } catch (error) {
            ApiResponse.error('Error fetching user')
        }
    }

    public async getCurrentUser(req: IUserCustomRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?._id;
            const tenant = req.clientAccount as string;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const user = await this.userService.getUserById(userId.toString(), tenant);
            res.status(200).json(
                ApiResponse.success(user, 'User fetched successfully')
            );
        } catch (error) {
            ApiResponse.error('Error fetching user')
        }
    }

    private listInitOptions = (req: IUserCustomRequest) => {
        const order = parseInt(req.query.order?.toString() || '-1', 10);
        const sort = req.query.sort?.toString() || 'createdAt';
        const sortBy = this.buildSort(sort, order);
        const page = parseInt(req.query.page?.toString() || '1', 10);
        const limit = parseInt(req.query.limit?.toString() || '15', 10);
        
        return {
            sort: sortBy,
            lean: true,
            page,
            limit
        };
    };
    private buildSort = (sort: string, order: number): Record<string, 1 | -1> => {
        const sortBy: Record<string, 1 | -1> = {};
        sortBy[sort] = order === 1 ? 1 : -1;
        return sortBy;
    };
}
