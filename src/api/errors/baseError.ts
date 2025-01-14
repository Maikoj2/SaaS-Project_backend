export class BaseError extends Error {
    public timestamp: string;

    constructor(
        public message: string,
        public statusCode: number = 500,
        public name: string = 'Error'
    ) {
        super(message);
        this.timestamp = new Date().toISOString();
    }
}