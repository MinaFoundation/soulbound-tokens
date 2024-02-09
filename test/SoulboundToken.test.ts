import { Field, MerkleMap, Mina, PrivateKey, PublicKey, Signature, UInt32 } from "o1js";
import { SoulboundToken } from "../src/SoulboundToken";
import { BurnAuth } from "../src/BurnAuth";
import { SoulboundMetadata, SoulboundRequest } from "../src/SoulboundMetadata";
import { SoulboundTokenDriver } from "./SoulboundTokenDriver";
import { SoulboundErrors } from "../src/SoulboundErrors";

const accountCreationFee = 0;
const proofsEnabled = false;
const enforceTransactionLimits = false;

const burnAuth = new BurnAuth({type: BurnAuth.types.both});

describe('SoulboundToken', () => {

  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    ownerAccount: PublicKey,
    ownerKey: PrivateKey,
    issuerAddress: PublicKey,
    issuerKey: PrivateKey,
    issuer: SoulboundToken,
    driver: SoulboundTokenDriver,

    tokenMap: MerkleMap,

    validMetadata: SoulboundMetadata;

  beforeAll(async () => {
    if (proofsEnabled) await SoulboundToken.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ accountCreationFee, proofsEnabled, enforceTransactionLimits});
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount} = Local.testAccounts[0]);
    ({ privateKey: ownerKey, publicKey: ownerAccount} = Local.testAccounts[1]);
    issuerKey = PrivateKey.random();
    issuerAddress = issuerKey.toPublicKey();
    issuer = new SoulboundToken(issuerAddress);
    tokenMap = new MerkleMap();
    driver = new SoulboundTokenDriver(
      tokenMap,
      issuer,
      issuerKey,
      burnAuth,
      Local.testAccounts[2]
    );
    validMetadata = new SoulboundMetadata({
      ownerKey: ownerAccount,
      issuedBetween: [UInt32.from(0), UInt32.from(1000)],
      burnAuth: burnAuth,
      attributes: [Field(0)]
    });
  })

  describe('SoulboundToken', () => {
    it('generates and deploys the SoulboundToken contract', async () => {
      await driver.deploy();
    });

    it('issues a token', async () => {
      await driver.deploy();
      const request = 
        new SoulboundRequest({
          metadata: validMetadata,
          type: SoulboundRequest.types.issueToken})
      const signature = Signature.create(
        ownerKey,
        SoulboundRequest.toFields(request)
        );
      await driver.issue(request, signature);
    });
    it('verifies an issued token', async () => {
      await driver.deploy();
      const request = 
        new SoulboundRequest({
          metadata: validMetadata,
          type: SoulboundRequest.types.issueToken})
      const signature = Signature.create(
        ownerKey,
        SoulboundRequest.toFields(request)
        );
      await driver.issue(request, signature);
      await driver.verify(validMetadata);
    });

    // For some reason, this test does not work:
    // The error is thrown, but not caught by `toThrow()`
    it('fails to validate a nonexistent token', async () => {
      await driver.deploy();
      await expect(async () => {
        await driver.verify(validMetadata)
      }).rejects.toThrow(SoulboundErrors.invalidToken)
    })
    it('revokes an issued token', async () => {
      await driver.deploy();
      const issueRequest = new SoulboundRequest({
        metadata: validMetadata,
        type: SoulboundRequest.types.issueToken
      });
      const issueSignature = Signature.create(
        ownerKey,
        SoulboundRequest.toFields(issueRequest)
      );
      await driver.issue(issueRequest, issueSignature);

      const revokeRequest = new SoulboundRequest({
        metadata: validMetadata,
        type: SoulboundRequest.types.revokeToken
      });
      const revokeSignature = Signature.create(
        ownerKey, SoulboundRequest.toFields(revokeRequest)
      );
      await driver.revoke(revokeRequest, revokeSignature);
    });
    it('fails to verify a revoked token', async () => {
      await driver.deploy();
      const issueRequest = new SoulboundRequest({
        metadata: validMetadata,
        type: SoulboundRequest.types.issueToken
      });
      const issueSignature = Signature.create(
        ownerKey,
        SoulboundRequest.toFields(issueRequest)
      );
      await driver.issue(issueRequest, issueSignature);

      const revokeRequest = new SoulboundRequest({
        metadata: validMetadata,
        type: SoulboundRequest.types.revokeToken
      });
      const revokeSignature = Signature.create(
        ownerKey, SoulboundRequest.toFields(revokeRequest)
      );
      await driver.revoke(revokeRequest, revokeSignature);
      await expect(async () => {
        await driver.verify(validMetadata)
      }).rejects.toThrow(SoulboundErrors.invalidToken)
    });
    it('fails to revoke a token that has not been issued', async () => {
      await driver.deploy();
      const revokeRequest = new SoulboundRequest({
        metadata: validMetadata,
        type: SoulboundRequest.types.revokeToken
      });
      await expect(async () => {
        const revokeSignature = Signature.create(
          ownerKey, SoulboundRequest.toFields(revokeRequest)
        );
        await driver.revoke(revokeRequest, revokeSignature);
        }).rejects.toThrow(SoulboundErrors.invalidToken);
    });

  });
});
