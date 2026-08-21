declare module 'trim-request' {
    function all(req: any, res: any, next: any): void;
    const trimRequest: { all: typeof all };
    export default trimRequest;
} 