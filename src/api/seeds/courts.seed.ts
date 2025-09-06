import { Logger } from "../config";
import Court from "../models/mongoose/championship/court";
import { DatabaseHelper } from "../utils/database.helper";

const logger = new Logger();

export const courtSeeds = [
    // Ubicación 1: Nacional
    {
        name: "Nacional - A",
        type: "beach",
        status: "available",
        capacity: 500,
        location: "Nacional",
        dimensions: "20x40",
        surface: "sand",
        schedule: [],
        amenities: ["seating", "lighting"],
        maintenanceHistory: []
    },
    {
        name: "Nacional - B",
        type: "beach",
        status: "available",
        capacity: 500,
        location: "Nacional",
        dimensions: "20x40",
        surface: "sand",
        schedule: [],
        amenities: ["seating", "lighting"],
        maintenanceHistory: []
    },
    {
        name: "Nacional - C",
        type: "beach",
        status: "available",
        capacity: 500,
        location: "Nacional",
        dimensions: "20x40",
        surface: "sand",
        schedule: [],
        amenities: ["seating", "lighting"],
        maintenanceHistory: []
    },
    // Ubicación 2: Metropolitano
    {
        name: "Metropolitano - A",
        type: "beach",
        status: "available",
        capacity: 300,
        location: "Metropolitano",
        dimensions: "16x8",
        surface: "sand",
        amenities: ["shower", "shade"],
        schedule: [],
        maintenanceHistory: []
    },
    {
        name: "Metropolitano - B",
        type: "beach",
        status: "available",
        capacity: 300,
        location: "Metropolitano",
        dimensions: "16x8",
        surface: "sand",
        amenities: ["shower", "shade"],
        schedule: [],
        maintenanceHistory: []
    },
    {
        name: "Metropolitano - C",
        type: "beach",
        status: "available",
        capacity: 300,
        location: "Metropolitano",
        dimensions: "16x8",
        surface: "sand",
        amenities: ["shower", "shade"],
        schedule: [],
        maintenanceHistory: []
    }
];

export const seedCourts = async (tenant: string) => {
    try {
        for (const court of courtSeeds) {
            await DatabaseHelper.findOneAndUpdate(
                Court,
                tenant,
                { name: court.name },
                court,
                { upsert: true, new: true }
            );
        }
        logger.info('Courts seeded successfully');
    } catch (error) {
        logger.error('Error seeding courts:', error);
    }
};