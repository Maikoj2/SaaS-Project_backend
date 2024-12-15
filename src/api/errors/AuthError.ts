export class AuthError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'AuthError';
        // Asegurarse de que el mensaje se mantenga
        Object.defineProperty(this, 'message', {
            enumerable: true, // Esto hace que el mensaje sea visible en JSON
            value: message
        });
    }
}