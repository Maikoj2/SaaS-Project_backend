import { Response } from 'express';
import { Logger } from '../../config';
import { ApiResponse } from '../../responses/apiResponse';
import { ProfileService } from '../../services/profile/profile.service';
import { matchedData } from 'express-validator';
import { MongooseHelper } from '../../utils';
import { IUserCustomRequest } from '../../interfaces';

export class ProfileController {
    private readonly logger: Logger;
    private readonly profileService: ProfileService;


    constructor() {
        this.logger = new Logger();
        this.profileService = new ProfileService();
    }

    public getProfile = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;
            // Validar ID
            await MongooseHelper.validateId(userId);
            
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

    public updateProfile = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;
            const updateData = req.body;  // data to update
            // Validar ID
            await MongooseHelper.validateId(userId);
            
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

    public changePassword = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;

            // Validar ID
            await MongooseHelper.validateId(userId);

            const changePassword = await this.profileService.changePassword(userId, tenant, req.body);

            res.status(200).json(
                ApiResponse.success(changePassword, 'Password changed successfully')
            );
        } catch (error) {
            this.logger.error('Error changing password:', error);
            res.status(500).json(
                ApiResponse.error('Error changing password')
            );
        }
    }

    public updateStepper = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.id as string;
            const tenant = req.clientAccount as string;
            // Validar ID
            await MongooseHelper.validateId(userId);

            // const stepper = await this.profileService.updateStepper(userId, req.body);

            // res.status(200).json(
            //     ApiResponse.success(stepper, 'Stepper updated successfully')
            // );
        } catch (error) {
            this.logger.error('Error updating stepper:', error);
            res.status(500).json(
                ApiResponse.error('Error updating stepper')
            );
        }
    }
} 