import { Field, MerkleMap, Void } from "o1js";
import { OffchainMerkleMap } from "./OffchainMerkleMap";

/** Simple in-memory implementation of `OffchainMerkleMap`
 * 
 * This should only be used in testing, for real-world
 * applications, we need persistence.
 * 
 */
class MemoryMerkleMap implements OffchainMerkleMap {
    myMap: MerkleMap

    constructor() {
        this.myMap = new MerkleMap()
    }

    setAndGetNewRoot(index: Field, value: Field): Promise<Field> {
        this.myMap.set(index, value)
        return new Promise(() => this.myMap.get(index))
    }

    getRoot(): Promise<Field> {
        return new Promise(this.myMap.getRoot)
    }

    get(index: Field): Promise<Field> {
        return new Promise(() => this.myMap.get(index))
    }

}

export { MemoryMerkleMap }
