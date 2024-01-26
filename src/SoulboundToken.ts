import {
    Field,
    SmartContract, state, State, method, Signature, Struct, MerkleMap,
} from 'o1js';
import { RevocationPolicy } from './RevocationPolicy';
import { OffchainMerkleMap } from './OffchainMerkleMap/OffchainMerkleMap';
import { SoulboundMetadata } from './SoulboundMetadata';

class TokenState extends Struct({
    issueState: Field
}) {
    public static types = {
        nonexistent: Field(0),
        issued: Field(1),
        revoked: Field(2),
    }
}

/**  Implementation of soulbound tokens
 * 
 * This contract can issue tokens. Each token is uniquely described by its
 * `SoulboundMetadata` (which includes the `PubKey` that holds a given token).
 * 
 * We store the tokens in a `MerkleMap`, where the key is the hash of the
 * metadata, and the value is the current state of the token (it can be
 * issued, revoked, or nonexistent).
 * 
 * The `MerkleMap` is stored off-chain, but we keep its root on-chain as
 * part of the contract state.
 * 
*/
class SoulboundToken
 extends SmartContract {
    @state(Field) root = State<Field>();
    tokenMap: OffchainMerkleMap;

    // In this example, all tokens from this contract can be
    // revoked according to the same policy
    revocationPolicy: RevocationPolicy;

    @method init(): void {
        super.init();
        const emptyMap = new MerkleMap;
        this.root.set(emptyMap.getRoot());
    }

    @method public initialise(tokenMap: OffchainMerkleMap, revocationPolicy: RevocationPolicy): void {
        this.tokenMap = tokenMap;
        this.revocationPolicy = revocationPolicy;
    }

    @method async issueToken(metadata: SoulboundMetadata, signature: Signature) {
        // Check that the on-chain root matches the off-chain one
        const oldRoot = await this.tokenMap.getRoot()
        this.root.requireEquals(oldRoot);
        // Check that we are in the time window that the token
        // can be issued
        const [lower, upper] = metadata.issuedBetween;
        this.currentSlot.requireBetween(lower, upper);
        // Check that the `RevocationPolicy` has the right value
        metadata.revocationPolicy.type.assertEquals(this.revocationPolicy.type);
        // Check that the token has not been issued before
        const key = metadata.hash();
        signature.verify(metadata.holderKey, SoulboundMetadata.toFields(metadata));
        const currentState = await this.tokenMap.get(key);
        // Note that `MerkleMap.get` returns `Field(0)` for noexistent entries.
        currentState.assertEquals(TokenState.types.nonexistent)
        // Include the new token in the off-chain map, and update
        // the on-chain Merkle root
        const newRoot = await this.tokenMap.setAndGetNewRoot(
            key, 
            TokenState.types.issued
            )
        this.root.set(newRoot);
    }
}

export { SoulboundToken };
