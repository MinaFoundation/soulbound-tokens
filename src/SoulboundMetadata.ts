import { Field, PublicKey, Poseidon, UInt32, Struct } from 'o1js';
import { BurnAuth } from './BurnAuth';

/** Metadata that defines a token */
class SoulboundMetadata extends Struct({
    ownerKey: PublicKey,
    issuedBetween: [UInt32, UInt32],
    burnAuth: BurnAuth,
    attributes: [Field],
}) {
    hash(): Field {
        return Poseidon.hash(SoulboundMetadata.toFields(this));
    }
}

class SoulboundRequest extends Struct({
    metadata: SoulboundMetadata,
    type: Field,
}) {
    public static types = {
        issueToken: Field(0),
        revokeToken: Field(1)
    }
}

export { SoulboundMetadata, SoulboundRequest };
