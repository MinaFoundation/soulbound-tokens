const SoulboundErrors = {
    invalidToken:
      'This token is not valid. It might have been revoked, or has not been issued.',
    alreadyExists:
      'Cannot issue token, because it has already been issued.',
    wrongPolicy:
      'RevocationPolicy does not match what is expected by the issuer',
    missingHolderSignature:
      'This requires a signature from the token holder',
    unrevocable:
      'This token cannot be revoked as per the RevocationPolicy',
};
export { SoulboundErrors };