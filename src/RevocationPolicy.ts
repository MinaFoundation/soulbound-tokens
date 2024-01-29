import {
    Struct,
    Field
} from 'o1js';

/** When a token is issued, issuer and holder should agree on who can revoke the token */
class RevocationPolicy extends Struct ({
    type: Field,
}) {
    public static types = {
        // the issuer has the right to revoke tokens
        issuerOnly: Field(0),
        // only the holder of the token can revoke it
        holderOnly: Field(1),
        // a token can only be revoked if issuer and holder agree
        both: Field(2),
        // tokens are indestructible
        neither: Field(3),
    };
}

export { RevocationPolicy };