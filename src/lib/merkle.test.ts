import { describe, it, expect } from 'vitest'
import { buildMerkleTree, verifyMerkleProof, hashPair, hashLeaf } from './merkle'
import { credentialHash } from './crypto'

const leaf = (n: number) => `${n}`.padStart(64, '0')

describe('buildMerkleTree', () => {
  it('rejects an empty class', async () => {
    await expect(buildMerkleTree([])).rejects.toThrow(/no leaves/)
  })

  it('roots a single-leaf tree at the hashed leaf, with an empty proof', async () => {
    const tree = await buildMerkleTree([leaf(1)])
    expect(tree.root).toBe(await hashLeaf(leaf(1)))
    expect(tree.proofs[0]).toEqual([])
  })

  it('roots a two-leaf tree at the hash of the hashed pair', async () => {
    const tree = await buildMerkleTree([leaf(1), leaf(2)])
    expect(tree.root).toBe(await hashPair(await hashLeaf(leaf(1)), await hashLeaf(leaf(2))))
    expect(tree.proofs[0]).toEqual([await hashLeaf(leaf(2))])
    expect(tree.proofs[1]).toEqual([await hashLeaf(leaf(1))])
  })

  it('is deterministic for the same input', async () => {
    const leaves = Array.from({ length: 9 }, (_, i) => leaf(i))
    const a = await buildMerkleTree(leaves)
    const b = await buildMerkleTree(leaves)
    expect(a.root).toBe(b.root)
  })

  it('produces a different root when any credential changes', async () => {
    const base = await buildMerkleTree([leaf(1), leaf(2), leaf(3)])
    const altered = await buildMerkleTree([leaf(1), leaf(2), leaf(99)])
    expect(altered.root).not.toBe(base.root)
  })
})

describe('verifyMerkleProof', () => {
  // Odd sizes exercise the promote-the-odd-node path; 1 and 2 are the degenerate cases
  for (const size of [1, 2, 3, 5, 7, 8, 100]) {
    it(`verifies every leaf in a ${size}-student class`, async () => {
      const leaves = Array.from({ length: size }, (_, i) => leaf(i))
      const tree = await buildMerkleTree(leaves)
      for (let i = 0; i < size; i++) {
        expect(await verifyMerkleProof(leaves[i], tree.proofs[i], tree.root)).toBe(true)
      }
    })
  }

  it('rejects a credential that was never in the batch', async () => {
    const leaves = [leaf(1), leaf(2), leaf(3), leaf(4)]
    const tree = await buildMerkleTree(leaves)
    expect(await verifyMerkleProof(leaf(999), tree.proofs[0], tree.root)).toBe(false)
  })

  it('rejects a tampered proof', async () => {
    const leaves = [leaf(1), leaf(2), leaf(3), leaf(4)]
    const tree = await buildMerkleTree(leaves)
    const tampered = [...tree.proofs[0]]
    tampered[0] = leaf(777)
    expect(await verifyMerkleProof(leaves[0], tampered, tree.root)).toBe(false)
  })

  it("rejects a valid proof presented against another batch's root", async () => {
    const classOf2025 = await buildMerkleTree([leaf(1), leaf(2), leaf(3)])
    const classOf2026 = await buildMerkleTree([leaf(4), leaf(5), leaf(6)])
    expect(await verifyMerkleProof(leaf(1), classOf2025.proofs[0], classOf2026.root)).toBe(false)
  })

  it('rejects an internal node replayed as a leaf (second-preimage attack)', async () => {
    const leaves = [leaf(1), leaf(2), leaf(3), leaf(4)]
    const tree = await buildMerkleTree(leaves)
    const internal = await hashPair(await hashLeaf(leaf(1)), await hashLeaf(leaf(2)))
    const sibling = await hashPair(await hashLeaf(leaf(3)), await hashLeaf(leaf(4)))
    // The attacker knows an internal node and its sibling — enough to reach the
    // root — but a credential claim must not verify from halfway up the tree.
    expect(await verifyMerkleProof(internal, [sibling], tree.root)).toBe(false)
  })
})

describe('end-to-end with real credential hashes', () => {
  it('anchors a class of credentials and proves membership of each', async () => {
    const students = ['Jane Doe', 'John Roe', 'Alex Poe', 'Sam Moe', 'Kim Loe']
    const credentials = students.map((studentName) => ({
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:web:anchor-ed.vercel.app',
      credentialSubject: { studentName, degree: 'BSc Computer Science', year: 2026 },
    }))
    const salts = students.map((_, i) => `salt${i}`)
    const leaves = await Promise.all(credentials.map((c, i) => credentialHash(c, salts[i])))

    const tree = await buildMerkleTree(leaves)

    for (let i = 0; i < students.length; i++) {
      expect(await verifyMerkleProof(leaves[i], tree.proofs[i], tree.root)).toBe(true)
    }

    // A forged credential (same student, upgraded degree) must not verify
    const forged = await credentialHash(
      { ...credentials[0], credentialSubject: { ...credentials[0].credentialSubject, degree: 'PhD' } },
      salts[0]
    )
    expect(await verifyMerkleProof(forged, tree.proofs[0], tree.root)).toBe(false)
  })
})
