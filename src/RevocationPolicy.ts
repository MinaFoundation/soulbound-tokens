import {
    Struct,
    Field
} from 'o1js';

class RevocationPolicy extends Struct ({
    type: Field,
}) {
    public static types = {
        issuerOnly: 0,
        ownerOnly: 1,
        both: 2,
        neither: 3,
    };
}

export { RevocationPolicy };