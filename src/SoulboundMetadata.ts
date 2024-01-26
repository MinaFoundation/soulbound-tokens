import { Field, PublicKey, Poseidon, UInt32, Struct } from 'o1js';
import { RevocationPolicy } from './RevocationPolicy';

export class SoulboundMetadata extends Struct({
    holderKey: PublicKey,
    issuedBetween: [UInt32, UInt32],
    attributes: Field,
    revocationPolicy: RevocationPolicy
}) {
    hash(): Field {
        return Poseidon.hash(SoulboundMetadata.toFields(this));
    }
}
