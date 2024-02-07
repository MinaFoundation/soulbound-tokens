import { Field, PublicKey, Poseidon, UInt32, Struct } from 'o1js';
import { RevocationPolicy } from './RevocationPolicy';

/** Metadata that defines a token */
class SoulboundMetadata extends Struct({
    holderKey: PublicKey,
    issuedBetween: [UInt32, UInt32],
    revocationPolicy: RevocationPolicy,
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
