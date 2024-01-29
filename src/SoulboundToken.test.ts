import { AccountUpdate, Field, Mina, Poseidon, PrivateKey, PublicKey, Signature, UInt32 } from "o1js";
import { SoulboundToken } from "./SoulboundToken";
import { MemoryMerkleMap } from "./OffchainMerkleMap/MemoryMerkleMap";
import { RevocationPolicy } from "./RevocationPolicy";
import { sendTransaction } from "o1js/dist/node/lib/mina";
import { SoulboundMetadata } from "./SoulboundMetadata";

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

    tokenMap: MemoryMerkleMap;

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
    tokenMap = new MemoryMerkleMap();
  })

  async function localDeploy() {
    const tx = await Mina.transaction(deployerAccount, () => {
      issuer.initialise(tokenMap, revocationPolicy)
      issuer.deploy();
    })
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
        issuer.issueToken(metadata, signature);
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
