import { Account, Bool, Field, MerkleMap, MerkleMapWitness, Mina, PrivateKey, PublicKey, Signature } from "o1js";
import { SoulboundMetadata , SoulboundRequest } from "../src/SoulboundMetadata";
import { SoulboundToken, TokenState } from "../src/SoulboundToken";
import { RevocationPolicy } from "../src";
import { SoulboundErrors } from "../src/SoulboundErrors";

type Account = {publicKey: PublicKey; privateKey: PrivateKey;}

class SoulboundTokenDriver{
    tokenMap: MerkleMap;
    issuer: SoulboundToken;
    issuerKey: PrivateKey;
    revocationPolicy: RevocationPolicy;
    feePayerAccount: Account;

    constructor(
            tokenMap: MerkleMap,
            issuer: SoulboundToken,
            issuerKey: PrivateKey,
            revocationPolicy: RevocationPolicy,
            feePayerAccount: Account) {
        this.tokenMap = tokenMap;
        this.issuer = issuer;
        this.issuerKey = issuerKey;
        this.revocationPolicy = revocationPolicy;
        this.feePayerAccount = feePayerAccount;
    }

    public async deploy() {
        const tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
          this.issuer.deploy();
        });
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey, this.issuerKey]).send();
        const tx2 = await Mina.transaction(this.feePayerAccount.publicKey, () => {
            this.issuer.initialise(this.revocationPolicy, this.issuerKey.toPublicKey())
        });
        await tx2.prove();
        await tx2.sign([this.feePayerAccount.privateKey, this.issuerKey]).send();
    }

    public async issue(request: SoulboundRequest, signature: Signature) {
        const key = request.metadata.hash();
        const tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
          const witness = this.tokenMap.getWitness(key);
          this.issuer.issue(request, signature, witness);
        })
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey]).send();
        // Update the off-chain map as well
        this.tokenMap.set(key, TokenState.types.issued);
    }

    public async revoke(request: SoulboundRequest, holderSignature?: Signature) {
        const key = request.metadata.hash();
        const witness = this.tokenMap.getWitness(key);
        let tx: Mina.Transaction;
        switch (request.metadata.revocationPolicy.type) {
            case RevocationPolicy.types.holderOnly:
                if (typeof holderSignature !== undefined) {
                    tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
                        this.issuer.revokeHolder(request, witness, holderSignature!);
                    })
                } else { throw(SoulboundErrors.missingHolderSignature) }
                break;
            case RevocationPolicy.types.issuerOnly:
                // In a real world application, here would be some business logic
                // to determine if the revocation should be permitted
                const issuerSignature = Signature.create(
                    this.issuerKey,
                    SoulboundRequest.toFields(request));
                tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
                    this.issuer.revokeIssuer(request, witness, issuerSignature);
                })
                break;
            case RevocationPolicy.types.both:
                // Again, insert a check whether the issuer wants to agree to
                // the token being revoked
                if (typeof holderSignature !== undefined) {
                    const issuerSignature = Signature.create(
                        this.issuerKey,
                        SoulboundRequest.toFields(request));
                    tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
                        this.issuer.revokeBoth(request, witness, holderSignature!, issuerSignature);
                    })
                } else { throw(SoulboundErrors.missingHolderSignature) }
                    break;
            case RevocationPolicy.types.neither:
                throw(SoulboundErrors.unrevocable);
            default:
                throw('unexpected value for revocationPolicy')
        }
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey]).send();
        // Update the off-chain map as well
        this.tokenMap.set(key, TokenState.types.revoked);
    }

    public async verify(metadata: SoulboundMetadata): Promise<MerkleMapWitness> {
        const {witness} = this.getWitness(metadata);
        const tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
            this.issuer.verify(metadata, witness);
        })
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey]).send();
        return(witness);
    }

    public getWitness(metadata: SoulboundMetadata): {root: Field, witness: MerkleMapWitness} {
        const key = metadata.hash();
        return({root: key, witness: this.tokenMap.getWitness(key)});
    }
}

export { SoulboundTokenDriver };
