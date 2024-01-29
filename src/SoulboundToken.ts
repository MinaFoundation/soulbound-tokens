import {
    Field,
    SmartContract, state, State, method, Signature, Struct, MerkleMap, PublicKey, Bool,
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

    /** Assert integrity of the off-chain MerkleMap */
    async rootCheck(): Promise<void> {
        const root = await this.tokenMap.getRoot();
        this.root.requireEquals(root);
    }

    /** Issue a token
     *
     * @argument metadata: The @link SoulboundMetadata of the token to be issued
     * @param signature: A signature for the metadata, from the future token holder
     * 
     */
    @method public async issueToken(metadata: SoulboundMetadata, signature: Signature): Promise<void> {
        // Check that the on-chain root matches the off-chain one
        await this.rootCheck();
        // Check that we are in the time window that the token
        // can be issued
        const [lower, upper] = metadata.issuedBetween;
        this.currentSlot.requireBetween(lower, upper);
        // Check that the `RevocationPolicy` has the right value
        metadata.revocationPolicy.type.assertEquals(this.revocationPolicy.type);
        // Check that the token has not been issued before
        const key = metadata.hash();
        signature.verify(metadata.holderKey, SoulboundMetadata.toFields(metadata)).assertEquals(Bool(true));
        const currentState = await this.tokenMap.get(key);
        // Note that `MerkleMap.get` returns `Field(0)` for noexistent entries.
        currentState.assertEquals(TokenState.types.nonexistent)
        // Include the new token in the off-chain map, and update
        // the on-chain Merkle root

        // TODO: Add custom business logic here if you do not want
        // to issue issue tokens unconditionally

        const root = await this.tokenMap.setAndGetNewRoot(
            key, 
            TokenState.types.issued
            );
        this.root.set(root);
    }

    /** Revoke an existing token
     *
     * This does not yet check the `RevocationPolicy` of the token.
     */
    @method public async revoke(metadata: SoulboundMetadata): Promise<void> {
        await this.rootCheck();
        const key = metadata.hash();
        const currentState = await this.tokenMap.get(key);
        currentState.assertEquals(TokenState.types.issued);
        const policyType = metadata.revocationPolicy.type;
        // TODO: check revocation policy
        const root = await this.tokenMap.setAndGetNewRoot(
            key,
            TokenState.types.revoked
        );
        this.root.set(root);
    }

    /** Verify that a token exists and is not revoked */
    @method public async verify(metadata: SoulboundMetadata): Promise<void> {
        await this.rootCheck();
        const key = metadata.hash();
        const currentState = await this.tokenMap.get(key);
        //note: we could require a signature from the owner,
        // if we do not want anyone to be able to validate
        currentState.assertEquals(TokenState.types.issued);
    }
}

export { SoulboundToken };
