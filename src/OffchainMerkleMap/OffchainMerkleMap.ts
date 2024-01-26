import { Bool, Field, MerkleMap, Void } from "o1js";

interface OffchainMerkleMap {
    setAndGetNewRoot: (index: Field, value: Field) => Promise<Field>
    getRoot: () => Promise<Field>
    get: (index: Field) => Promise<Field>
}

export { OffchainMerkleMap }
