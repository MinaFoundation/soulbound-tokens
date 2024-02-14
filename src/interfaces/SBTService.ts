import { MerkleMapWitness, PublicKey, Signature } from "o1js";
import { SoulboundMetadata, SoulboundRequest } from "../SoulboundMetadata";

interface SBTService {
    issue(request: SoulboundRequest, signature: Signature): Promise<void>
    revoke(request: SoulboundRequest, ownerSignature?: Signature): Promise<void>
    verify(metadata: SoulboundMetadata): Promise<MerkleMapWitness>
}

interface SBTQuery {
    getSoulboundToken(owner: PublicKey): SoulboundMetadata | undefined
}

export { SBTService, SBTQuery }