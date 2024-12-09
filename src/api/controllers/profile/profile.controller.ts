import { Response } from 'express';
import { Logger } from '../../config';
import { ApiResponse } from '../../responses/apiResponse';
import { ProfileService } from '../../services';
import { CustomRequest } from '../../interfaces';
import { matchedData } from 'express-validator';

export class ProfileController {
    private readonly logger: Logger;
    private readonly profileService: ProfileService;

    constructor() {
        this.logger = new Logger();
        this.profileService = new ProfileService();
    }

    public getProfile = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;
            
            const profile = await this.profileService.getProfile(userId, tenant);
            
            res.status(200).json(
                ApiResponse.success(profile, 'Profile retrieved successfully')
            );
        } catch (error) {
            this.logger.error('Error getting profile:', error);
            res.status(500).json(
                ApiResponse.error('Error retrieving profile')
            );
        }
    }

    public updateProfile = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;
            const updateData = req.body;  // data to update
            
            // validate that there is data to update
            if (!updateData || Object.keys(updateData).length === 0) {
                res.status(400).json(
                    ApiResponse.error('No data provided for update')
                );
                return;
            }
            req = matchedData(req)
            const updatedProfile = await this.profileService.updateProfile(
                userId, 
                updateData,  // pass the data to update
                tenant
            );
            
            res.status(200).json(
                ApiResponse.success(updatedProfile, 'Profile updated successfully')
            );
        } catch (error) {
            this.logger.error('Error updating profile:', error);
            res.status(500).json(
                ApiResponse.error('Error updating profile')
            );
        }
    }
} 