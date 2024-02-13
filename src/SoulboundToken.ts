import {
    Field,
    SmartContract, state, State, method, Signature, Struct, MerkleMap, Bool, MerkleMapWitness, PublicKey,
} from 'o1js';
import { BurnAuth } from './BurnAuth';
import { SoulboundMetadata, SoulboundRequest } from './SoulboundMetadata';
import { SoulboundErrors } from './SoulboundErrors';

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
    events = {
        'update-merkle-root': Field,
        'issue-token': SoulboundMetadata,
        'revoke-token': SoulboundMetadata,
      };
    // Root of the `MerkleMap` that contains all the tokens
    @state(Field) public readonly root = State<Field>();
    // In this example, all tokens from this contract can be
    // revoked according to the same policy
    @state(BurnAuth) public readonly burnAuth = State<BurnAuth>();
    @state(PublicKey) public readonly issuerKey = State<PublicKey>();
    @state(Bool) public readonly initialised = State<Bool>()

    @method init(): void {
        super.init();
        const emptyMap = new MerkleMap;
        this.updateRoot(emptyMap.getRoot());
        this.initialised.set(Bool(false));
    }

    @method initialise(burnAuth: BurnAuth, issuerKey: PublicKey): void {
        // this check prevents anyone from overwriting the state
        // by calling initialise again
        // Note that in production, you would want to ensure that only
        // the creator of the token can call initialise in the first place.
        // One way of doing that is by hard-coding an initial public key into
        // the code of the contract.
        this.initialised.requireEquals(this.initialised.get());
        this.initialised.get().assertFalse();
        this.burnAuth.set(burnAuth);
        this.issuerKey.set(issuerKey);
        this.initialised.set(Bool(true));
    }

    /** Issue a token
     *
     * @argument metadata: The @link SoulboundMetadata of the token to be issued
     * @param signature: A signature for the metadata, from the future token owner
     * 
     */
    @method public issue(
        request: SoulboundRequest,
        signature: Signature,
        witness: MerkleMapWitness
        ) {
        this.root.requireEquals(this.root.get());
        this.burnAuth.requireEquals(this.burnAuth.get());

        // Check that we are in the time window that the token
        // can be issued
        const [lower, upper] = request.metadata.issuedBetween;
        this.currentSlot.requireBetween(lower, upper);

        // Check that the `BurnAuth` has the right value
        request.metadata.burnAuth.type
          .assertEquals(
            this.burnAuth.get().type,
            SoulboundErrors.wrongPolicy
            );

        // Check that the signed message requests issuing a token
        // This prevents a "replay" attack where the message and
        // signature used to issue a token could be used to revoke it
        request.type.assertEquals(SoulboundRequest.types.issueToken);

        // Check signature of owner
        signature.verify(request.metadata.ownerKey, SoulboundRequest.toFields(request)).assertEquals(Bool(true));

        // Check that the token has not been issued before
        const expextedKey = request.metadata.hash();
        const [root, key ] = witness.computeRootAndKey(TokenState.types.nonexistent);
        root.assertEquals(this.root.get());
        key.assertEquals(expextedKey);
 
        // NOTE: Add custom business logic here if you do not want
        // to issue issue tokens unconditionally

        // Update the on-chain root
        const [newRoot, _] = witness.computeRootAndKey(TokenState.types.issued);
        this.updateRoot(newRoot);
        this.emitEvent('issue-token', request.metadata);
    }

    /** Verify that a token exists and is not revoked */
    @method public verify(metadata: SoulboundMetadata,
        witness: MerkleMapWitness
        ) {
            //note: we could require a signature from the owner,
            // if we do not want anyone to be able to validate
            this.root.requireEquals(this.root.get());
            this.verifyAgainstRoot(this.root.get(), metadata, witness)
        }

    verifyAgainstRoot(expextedRoot: Field, metadata: SoulboundMetadata, witness: MerkleMapWitness) {
        const expectedKey = metadata.hash();
        const [root, key] = witness.computeRootAndKey(TokenState.types.issued)
        expextedRoot.assertEquals(root, SoulboundErrors.invalidToken);
        expectedKey.assertEquals(key, SoulboundErrors.invalidToken);
    }

    @method public revokeOwner(
        request: SoulboundRequest,
        witness: MerkleMapWitness,
        ownerSignature: Signature
        ) {
            request.metadata.burnAuth.type.assertEquals(
                BurnAuth.types.ownerOnly
            );
            ownerSignature.verify(
                request.metadata.ownerKey,
                SoulboundRequest.toFields(request)
            );
            this.internalRevoke(request.metadata, witness);
        }
    @method revokeIssuer(
        request: SoulboundRequest,
        witness: MerkleMapWitness,
        issuerSignature: Signature
        ) {
            request.metadata.burnAuth.type.assertEquals(
                BurnAuth.types.issuerOnly
            );
            issuerSignature.verify(
                this.issuerKey.getAndRequireEquals(),
                SoulboundRequest.toFields(request)
            );
            this.internalRevoke(request.metadata, witness);
        }
    @method revokeBoth(
        request: SoulboundRequest,
        witness: MerkleMapWitness,
        ownerSignature: Signature,
        issuerSignature: Signature
        ) {
            request.metadata.burnAuth.type.assertEquals(
                BurnAuth.types.both
            );
            ownerSignature.verify(
                request.metadata.ownerKey,
                SoulboundRequest.toFields(request)
            );
            issuerSignature.verify(
                this.issuerKey.getAndRequireEquals(),
                SoulboundRequest.toFields(request)
            );
            this.internalRevoke(request.metadata, witness);
        }
    private internalRevoke(
        metadata: SoulboundMetadata,
        witness: MerkleMapWitness
        ) {
            const currentRoot = this.root.getAndRequireEquals();
            metadata.burnAuth.type.assertEquals(
                this.burnAuth.getAndRequireEquals().type
            );
            this.verifyAgainstRoot(currentRoot, metadata, witness);
            const [newRoot, _] = witness.computeRootAndKey(TokenState.types.revoked);
            this.updateRoot(newRoot);
            this.emitEvent('revoke-token', metadata);
        }

    private updateRoot(root: Field) {
        this.root.set(root);
        this.emitEvent('update-merkle-root', root);
    }
}

export { SoulboundToken, TokenState };
