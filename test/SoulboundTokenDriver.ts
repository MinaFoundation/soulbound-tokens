import { Account, MerkleMap, Mina, PrivateKey, PublicKey, Signature } from "o1js";
import { SoulboundMetadata } from "../src/SoulboundMetadata";
import { SoulboundToken, TokenState } from "../src/SoulboundToken";
import { RevocationPolicy } from "../src";

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
          this.issuer.initialise(this.revocationPolicy)
          this.issuer.deploy();
        });
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey, this.issuerKey]).send();
      }

    public async issue(metadata: SoulboundMetadata, signature: Signature) {
        const key = metadata.hash();
        const tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
          const witness = this.tokenMap.getWitness(key);
          this.issuer.issue(metadata, signature, witness);
        })
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey]).send();
        // Update the off-chain map as well
        this.tokenMap.set(key, TokenState.types.issued);
    }

    public async verify(metadata: SoulboundMetadata) {
        const key = metadata.hash();
        const tx = await Mina.transaction(this.feePayerAccount.publicKey, () => {
            const witness = this.tokenMap.getWitness(key);
            this.issuer.verify(metadata, witness);
        })
        await tx.prove();
        await tx.sign([this.feePayerAccount.privateKey]).send();
    }
}

export { SoulboundTokenDriver };