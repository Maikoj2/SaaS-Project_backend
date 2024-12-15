interface SocialNetwork {
    type: string;
    url: string;
}
interface Address {
    street?: string;
    city?: string;
    country?: string;
    department?: string;
    postalCode?: string;
}
interface UserInputData {
    name: string;
    lastName: string;
    email: string;
    password: string;
    tag: string[];
    avatar?: string;
    description?: string;
    nameBusiness?: string;
    role: 'admin' | 'organizer' | 'referee' | 'team_member' | 'viewer';
    phone?: string;
    
    // Campos de dirección
    street?: string;
    city?: string;
    country?: string;
    department?: string;
    postalCode?: string;
    
    // URLs de redes sociales
    urlTwitter?: string;
    urlFacebook?: string;
    urlInstagram?: string;
    urlLinkedin?: string;
    urlGitHub?: string;
}
export class DataProcessor {
    static processSocialNetworks(updateData: any): any {
        let socialNetworks: SocialNetwork[] = [];

        // Lista de redes sociales soportadas
        const socialTypes = {
            github: 'urlGitHub',
            twitter: 'urlTwitter',
            facebook: 'urlFacebook',
            instagram: 'urlInstagram',
            linkedin: 'urlLinkedin'
        };

        // Procesar URLs individuales
        const hasIndividualUrls = Object.values(socialTypes).some(
            field => updateData[field as keyof UserInputData]
        );

        if (hasIndividualUrls) {
            Object.entries(socialTypes).forEach(([type, field]) => {
                if (updateData[field as keyof UserInputData]) {
                    socialNetworks.push({
                        type,
                        url: updateData[field as keyof UserInputData]
                    });
                    delete updateData[field as keyof UserInputData];
                }
            });
        }
        // Procesar array de redes sociales
        else if (updateData.socialNetwork?.length > 0) {
            socialNetworks = updateData.socialNetwork.map((network: SocialNetwork) => ({
                type: network.type,
                url: network.url,
            }));
            delete updateData.socialNetwork;
        }

        return {
            ...updateData,
            socialNetwork: socialNetworks
        };
    }

    static processAddress(updateData: UserInputData): any {
        console.log('Valores de dirección recibidos:', {
            street: updateData.street,
            city: updateData.city,
            country: updateData.country,
            department: updateData.department
        });
        const addressFields: Address = {
            street: updateData.street || '',
            city: updateData.city || '',
            country: updateData.country || '',
            department: updateData.department || '',
            postalCode: updateData.postalCode || ''
        };

        // Eliminar campos sueltos
        delete updateData.street;
        delete updateData.city;
        delete updateData.country;
        delete updateData.department;
        delete updateData.postalCode;

        return {
            ...updateData,
            address: addressFields
        };
    }

    static processAllData(updateData: any): any {
        // Procesar tanto redes sociales como dirección
        const withSocialNetworks = this.processSocialNetworks(updateData);
        const withAddress = this.processAddress(withSocialNetworks);

        return withAddress;
    }
} 