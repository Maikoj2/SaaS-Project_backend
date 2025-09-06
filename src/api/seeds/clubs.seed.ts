import { Logger } from "../config";
import Club from "../models/mongoose/championship/club";
import { DatabaseHelper } from "../utils/database.helper";

const logger = new Logger();

export const clubSeeds = [
    {
        name: "Independiente",  // Club especial para jugadores sin club
        location: "N/A",
        founded: new Date("2024-01-01"),
        president: "Sistema",
        website: null,
        logo: "default/independent_logo.png",
        teams: []
    },
    {
        name: "Club Deportivo Voleibol Bogotá",
        location: "Bogotá, Colombia",
        founded: new Date("1985-03-15"),
        president: "Carlos Ramírez",
        website: "www.voleibogota.com",
        logo: "clubs/bogota_logo.png",
        teams: []
    },
    {
        name: "Club Voleibol Medellín",
        location: "Medellín, Colombia",
        founded: new Date("1990-08-22"),
        president: "Ana María López",
        website: "www.volleymedellin.co",
        logo: "clubs/medellin_logo.png",
        teams: []
    },
    {
        name: "Club Deportivo Cali Volley",
        location: "Cali, Colombia",
        founded: new Date("1988-05-10"),
        president: "Juan Pablo Montoya",
        website: "www.calivolley.com",
        logo: "clubs/cali_logo.png",
        teams: []
    },
    {
        name: "Barranquilla Volleyball Club",
        location: "Barranquilla, Colombia",
        founded: new Date("1992-11-30"),
        president: "María Fernanda Torres",
        website: "www.baqvolley.co",
        logo: "clubs/barranquilla_logo.png",
        teams: []
    }
];

export const seedClubs = async (tenant: string) => {
    try {
        for (const club of clubSeeds) {
            
            await DatabaseHelper.findOneAndUpdate(
                Club,
                tenant,
                { name: club.name },
                club,
                { upsert: true, new: true }
            );
        }
        logger.info('Clubs seeded successfully');
    } catch (error) {
        logger.error('Error seeding clubs:', error);
    }
}; 