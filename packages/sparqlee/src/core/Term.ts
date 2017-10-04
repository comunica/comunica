
// See https://github.com/rdfjs/representation-task-force/blob/master/interface-spec.md

export class Term {
    termType: string;
    value: string;

    constructor(termType: string, value: string) {
        this.termType = termType;
        this.value = value;
    }

    equals(other: Term) :boolean {
        return other.termType == this.termType &&
               other.value  == this.value;
    }
}

export class NamedNode extends Term {
    constructor(value: string){
        super(TermTypes.NamedNode, value);
    }
}

export class BlankNode extends Term {
    constructor(value: string){
        super(TermTypes.BlankNode, value);
    }
}

export class Literal extends Term {
    language: string;
    dataType: NamedNode;

    constructor(value: string, language?: string, dataType?: NamedNode){
        super(TermTypes.Literal, value);
    }
}

export class Variable extends Term {
    constructor(value: string){
        super(TermTypes.Variable, value);
    }
}

export class DefaultGraph extends Term {
    constructor(value: string){
        super(TermTypes.DefaultGraph, value);
    }
}


export enum TermTypes {
    NamedNode = "NamedNode",
    BlankNode = "BlankNode",
    Literal = "Literal",
    Variable = "Variable",
    DefaultGraph = "DefaultGraph"
}
