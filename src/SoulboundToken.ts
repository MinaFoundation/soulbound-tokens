import {
    Field,
    SmartContract, state, State, method, Signature, Struct, MerkleMap, Bool, MerkleMapWitness,
} from 'o1js';
import { RevocationPolicy } from './RevocationPolicy';
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
 * In order to do any operation, users will need to be able to create a
 * `MerkleMapWitness` for their tokens. This should be facilitated by an
 * off-chain service that has access to the full `MerkleMap`. In order to
 * keep the off-chain map in sync with the on-chain root, and to prevent 
 * concurrent updates and queries to the map, this service should sequence
 * calls to the contract, and only update the actual map once the call
 * was successful.
 * 
*/
class SoulboundToken
 extends SmartContract {
    // Root of the `MerkleMap` that contains all the tokens
    @state(Field) root = State<Field>();
    // In this example, all tokens from this contract can be
    // revoked according to the same policy
    @state(RevocationPolicy) revocationPolicy = State<RevocationPolicy>();

    @method init(): void {
        super.init();
        const emptyMap = new MerkleMap;
        this.root.set(emptyMap.getRoot());
    }

    public initialise(revocationPolicy: RevocationPolicy): void {
        this.revocationPolicy.set(revocationPolicy);
    }

    /** Issue a token
     *
     * @argument metadata: The @link SoulboundMetadata of the token to be issued
     * @param signature: A signature for the metadata, from the future token holder
     * 
     */
    @method public async issue(metadata: SoulboundMetadata, signature: Signature, witness: MerkleMapWitness): Promise<void> {
        this.root.requireEquals(this.root.get());
        this.revocationPolicy.requireEquals(this.revocationPolicy.get());

        // Check that we are in the time window that the token
        // can be issued
        const [lower, upper] = metadata.issuedBetween;
        this.currentSlot.requireBetween(lower, upper);

        // Check that the `RevocationPolicy` has the right value
        metadata.revocationPolicy.type.assertEquals(this.revocationPolicy.get().type);

        // Check signature of holder
        signature.verify(metadata.holderKey, SoulboundMetadata.toFields(metadata)).assertEquals(Bool(true));

        // Check that the token has not been issued before
        const expextedKey = metadata.hash();
        const [root, key ] = witness.computeRootAndKey(TokenState.types.nonexistent);
        root.assertEquals(this.root.get());
        key.assertEquals(expextedKey);
 
        // NOTE: Add custom business logic here if you do not want
        // to issue issue tokens unconditionally

        // Update the on-chain root
        const [newRoot, _] = witness.computeRootAndKey(TokenState.types.issued);
        this.root.set(newRoot);
    }

    /** Revoke an existing token
     *
     * This does not yet check the `RevocationPolicy` of the token.
     */
    @method public async revoke(metadata: SoulboundMetadata, witness: MerkleMapWitness): Promise<void> {
        this.root.requireEquals(this.root.get());
        this.revocationPolicy.requireEquals(this.revocationPolicy.get());

        // check that the token is issued and has not yet been revoked
        this.verify(metadata, witness);

        // TODO: check revocation policy

        // update the merkle root to have the token revoked
        const [root, _] = witness.computeRootAndKey(TokenState.types.revoked);
        this.root.set(root);
    }

    /** Verify that a token exists and is not revoked */
    @method public async verify(metadata: SoulboundMetadata, witness: MerkleMapWitness): Promise<void> {
        //note: we could require a signature from the owner,
        // if we do not want anyone to be able to validate
        this.root.requireEquals(this.root.get());

        const expectedKey = metadata.hash();
        const [root, key] = witness.computeRootAndKey(TokenState.types.issued)
        this.root.requireEquals(root);
        expectedKey.assertEquals(key);
    }
}

export { SoulboundToken, TokenState };
