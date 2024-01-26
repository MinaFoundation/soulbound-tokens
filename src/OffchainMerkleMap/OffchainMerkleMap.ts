import { Bool, Field, MerkleMap, Void } from "o1js";
/** This is an abstraction for an off-chain `MerkleMap`
 * 
 * We use that in our implementation of soulbound tokens,
 * so that we do not tie ourselves to a specific mechanism
 * of storing offchain data.
 * 
 */
interface OffchainMerkleMap {
    setAndGetNewRoot: (index: Field, value: Field) => Promise<Field>
    getRoot: () => Promise<Field>
    get: (index: Field) => Promise<Field>
}

export { OffchainMerkleMap }
