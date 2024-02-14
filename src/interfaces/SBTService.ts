import { MerkleMapWitness, Signature } from "o1js";
import { SoulboundMetadata, SoulboundRequest } from "../SoulboundMetadata";

interface SBTService {
    issue(request: SoulboundRequest, signature: Signature): Promise<void>
    revoke(request: SoulboundRequest, ownerSignature?: Signature): Promise<void>
    verify(metadata: SoulboundMetadata): Promise<MerkleMapWitness>
}

export { SBTService }