import { sha256Hex } from './crypto'

/**
 * Merkle batch anchoring.
 *
 * A graduating class is hashed into a single Merkle tree whose root is anchored
 * in ONE NFT mint — so a 5,000-student class costs one signature and one
 * transaction instead of 5,000. Each student's credential file carries a short
 * proof (log2(n) hashes) showing their credential is a leaf of that tree.
 *
 * Design notes:
 * - Pairs are sorted before hashing, so proofs need no direction bits.
 * - Leaves and internal nodes use DIFFERENT domain prefixes. Without this, an
 *   attacker who knows an internal node can submit it as a leaf with a truncated
 *   proof and it verifies (the classic Merkle second-preimage attack) — the test
 *   suite covers exactly this case.
 * - Odd nodes are promoted to the next level unchanged rather than duplicated;
 *   duplication allows two different trees to share a root.
 */

const LEAF_PREFIX = 'ANCHORED-LEAF:'
const NODE_PREFIX = 'ANCHORED-NODE:'

export interface MerkleTree {
  root: string
  leaves: string[]
  /** proofs[i] is the sibling chain for leaves[i], leaf level first */
  proofs: string[][]
}

/** Hash a raw credential hash into its leaf-level node. */
export async function hashLeaf(leaf: string): Promise<string> {
  return sha256Hex(`${LEAF_PREFIX}${leaf}`)
}

/** Hash an unordered pair of nodes. */
export async function hashPair(a: string, b: string): Promise<string> {
  const [x, y] = a <= b ? [a, b] : [b, a]
  return sha256Hex(`${NODE_PREFIX}${x}${y}`)
}

export async function buildMerkleTree(leaves: string[]): Promise<MerkleTree> {
  if (!leaves.length) throw new Error('Cannot build a Merkle tree with no leaves')

  // levels[0] is the leaf level; each subsequent level is half the size (rounded up)
  const levels: string[][] = [await Promise.all(leaves.map(hashLeaf))]
  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1]
    const next: string[] = []
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? await hashPair(current[i], current[i + 1]) : current[i])
    }
    levels.push(next)
  }

  const proofs = leaves.map((_, leafIndex) => {
    const proof: string[] = []
    let index = leafIndex
    for (let level = 0; level < levels.length - 1; level++) {
      const nodes = levels[level]
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1
      // No sibling means this node was promoted unchanged — nothing to prove at this level
      if (siblingIndex < nodes.length) proof.push(nodes[siblingIndex])
      index = Math.floor(index / 2)
    }
    return proof
  })

  return { root: levels[levels.length - 1][0], leaves: leaves.slice(), proofs }
}

/** Recompute the root from a leaf and its proof, and compare with the expected root. */
export async function verifyMerkleProof(leaf: string, proof: string[], root: string): Promise<boolean> {
  let computed = await hashLeaf(leaf)
  for (const sibling of proof) {
    computed = await hashPair(computed, sibling)
  }
  return computed === root
}
