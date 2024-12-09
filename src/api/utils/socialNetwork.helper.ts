interface SocialNetwork {
    type: string;
    url: string;
}

export class SocialNetworkHelper {
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
            field => updateData[field]
        );

        if (hasIndividualUrls) {
            Object.entries(socialTypes).forEach(([type, field]) => {
                if (updateData[field]) {
                    socialNetworks.push({ 
                        type, 
                        url: updateData[field] 
                    });
                    delete updateData[field];
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
} 