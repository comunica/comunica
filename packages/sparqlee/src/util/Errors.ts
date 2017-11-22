export class UnimplementedError extends Error {
    constructor(){
        super("Unimplemented!")
    }
}

export class InvalidOperationError extends Error {
    constructor(){
        super("Operation not valid for term")
    }
}