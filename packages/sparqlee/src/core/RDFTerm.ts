
// See https://github.com/rdfjs/representation-task-force/blob/master/interface-spec.md

export class RDFTerm {
    termType: string;
    value: string;

    constructor(termType: string, value: string) {
        this.termType = termType;
        this.value = value;
    }

    equals(other: RDFTerm) :boolean {
        return other.termType == this.termType &&
               other.value  == this.value;
    }
}

export class RDFNamedNode extends RDFTerm {
    constructor(value: string){
        super(RDFTermTypes.RDFNamedNode, value);
    }
}

export class RDFBlankNode extends RDFTerm {
    constructor(value: string){
        super(RDFTermTypes.RDFBlankNode, value);
    }
}

export class RDFLiteral extends RDFTerm {
    language: string;
    dataType: RDFNamedNode;

    constructor(value: string, language?: string, dataType?: RDFNamedNode){
        super(RDFTermTypes.RDFLiteral, value);
    }
}

export class RDFVariable extends RDFTerm {
    constructor(value: string){
        super(RDFTermTypes.RDFVariable, value);
    }
}

export class RDFDefaultGraph extends RDFTerm {
    constructor(value: string){
        super(RDFTermTypes.RDFDefaultGraph, value);
    }
}


export enum RDFTermTypes {
    RDFNamedNode = "NamedNode",
    RDFBlankNode = "BlankNode",
    RDFLiteral = "Literal",
    RDFVariable = "Variable",
    RDFDefaultGraph = "DefaultGraph"
}
