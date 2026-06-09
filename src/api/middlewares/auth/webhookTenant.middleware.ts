import { NextFunction, Response } from "express";
import { IUserCustomRequest } from "../../interfaces";
import { ApiResponse } from "../../responses";



export const extractTenantFromParams = (req: IUserCustomRequest, res: Response, next: NextFunction) => {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
        return res.status(400).json(
            ApiResponse.error('Tenant ID is required in webhook parameters')
        );
    }
    req.clientAccount = tenantId;
    next();
}