import { Field, PublicKey, Poseidon, UInt32, Struct } from 'o1js';
import { RevocationPolicy } from './RevocationPolicy';

/** Metadata that defines a token */
export class SoulboundMetadata extends Struct({
    holderKey: PublicKey,
    issuedBetween: [UInt32, UInt32],
    revocationPolicy: RevocationPolicy,
    attributes: [Field],
}) {
    hash(): Field {
        return Poseidon.hash(SoulboundMetadata.toFields(this));
    }
}
