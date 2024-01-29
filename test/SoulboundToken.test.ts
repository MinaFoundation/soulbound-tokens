import { Field, MerkleMap, Mina, PrivateKey, PublicKey, Signature, UInt32 } from "o1js";
import { SoulboundToken } from "../src/SoulboundToken";
import { RevocationPolicy } from "../src/RevocationPolicy";
import { SoulboundMetadata } from "../src/SoulboundMetadata";

const accountCreationFee = 0;
const proofsEnabled = false;
const enforceTransactionLimits = false;

const revocationPolicy = new RevocationPolicy({type: RevocationPolicy.types.issuerOnly});

describe('SoulboundToken', () => {

  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    holderAccount: PublicKey,
    holderKey: PrivateKey,
    issuerAddress: PublicKey,
    issuerKey: PrivateKey,
    issuer: SoulboundToken,

    tokenMap: MerkleMap;

  beforeAll(async () => {
    if (proofsEnabled) await SoulboundToken.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ accountCreationFee, proofsEnabled, enforceTransactionLimits});
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount} = Local.testAccounts[0]);
    ({ privateKey: holderKey, publicKey: holderAccount} = Local.testAccounts[1]);
    issuerKey = PrivateKey.random();
    issuerAddress = issuerKey.toPublicKey();
    issuer = new SoulboundToken(issuerAddress);
    tokenMap = new MerkleMap();
  })

  async function localDeploy() {
    const tx = await Mina.transaction(deployerAccount, () => {
      issuer.initialise(revocationPolicy)
      issuer.deploy();
    });
    await tx.prove();
    await tx.sign([deployerKey, issuerKey]).send();
  }

  describe('SoulboundToken', () => {
    it('generates and deploys the SoulboundToken contract', async () => {
      await localDeploy();
    });

    it('issues a token', async () => {
      await localDeploy();

      const tx = await Mina.transaction(holderAccount, () => {
        const metadata = new SoulboundMetadata({
          holderKey: holderAccount,
          issuedBetween: [UInt32.from(0), UInt32.from(1000)],
          revocationPolicy: revocationPolicy,
          attributes: [Field(0)]
        });
        const signature = Signature.create(holderKey, SoulboundMetadata.toFields(metadata));
        const key = metadata.hash()
        const witness = tokenMap.getWitness(key)
        issuer.issue(metadata, signature, witness);
      });
      await tx.prove();
      await tx.sign([holderKey]).send();
    });
    it.todo('verifies an issued token');
    it.todo('revokes an issued token');
    it.todo('fails to verify a revoked token');
    it.todo('fails to revoke a token that has not been issued');

  });
});
