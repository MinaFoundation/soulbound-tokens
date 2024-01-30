import { Field, MerkleMap, Mina, PrivateKey, PublicKey, Signature, UInt32 } from "o1js";
import { SoulboundToken } from "../src/SoulboundToken";
import { RevocationPolicy } from "../src/RevocationPolicy";
import { SoulboundMetadata } from "../src/SoulboundMetadata";
import { SoulboundTokenDriver } from "./SoulboundTokenDriver";

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
    driver: SoulboundTokenDriver,

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
    driver = new SoulboundTokenDriver(
      tokenMap,
      issuer,
      issuerKey,
      revocationPolicy,
      Local.testAccounts[2]
    );
  })

  describe('SoulboundToken', () => {
    it('generates and deploys the SoulboundToken contract', async () => {
      await driver.deploy();
    });

    it('issues a token', async () => {
      await driver.deploy();

        const metadata = new SoulboundMetadata({
          holderKey: holderAccount,
          issuedBetween: [UInt32.from(0), UInt32.from(1000)],
          revocationPolicy: revocationPolicy,
          attributes: [Field(0)]
        });
        const signature = Signature.create(holderKey, SoulboundMetadata.toFields(metadata));
        await driver.issue(metadata, signature);
    });
    it.todo('verifies an issued token');
    it.todo('revokes an issued token');
    it.todo('fails to verify a revoked token');
    it.todo('fails to revoke a token that has not been issued');

  });
});
