import { Client, Wallet } from 'xrpl'
import { Buffer } from 'buffer'

export async function withXrpl<T>(fn: (client: Client) => Promise<T>, url = 'wss://s.altnet.rippletest.net:51233'): Promise<T> {
  const client = new Client(url)
  await client.connect()
  try {
    return await fn(client)
  } finally {
    if (client.isConnected()) await client.disconnect()
  }
}

export async function submitAndWait(client: Client, wallet: Wallet, tx: any, maxAttempts = 3) {
  if (wallet.classicAddress !== tx.Account) {
    throw new Error('Wallet seed does not match Account address')
  }
  if (tx.URI && (!/^[0-9a-fA-F]*$/.test(tx.URI) || tx.URI.length > 512)) {
    throw new Error('URI must be hex and ≤ 256 bytes')
  }
  
  // Check if account exists before attempting to submit
  try {
    const accountInfo = await client.request({
      command: 'account_info',
      account: tx.Account
    })
    if (!accountInfo.result.account_data) {
      throw new Error(`Account ${tx.Account} not found on the network. Please fund the account first using a faucet (for testnet) or send XRP to activate it.`)
    }
  } catch (err: any) {
    // If it's already our custom error, rethrow it
    if (err.message && err.message.includes('not found on the network')) {
      throw err
    }
    // If it's an account not found error from XRPL, provide a helpful message
    if (err?.data?.error === 'actNotFound' || err?.data?.error_code === 19 || err?.message?.includes('actNotFound')) {
      throw new Error(`Account ${tx.Account} not found on the network. Please fund the account first using a faucet (for testnet) or send XRP to activate it.`)
    }
    // For other errors during account check, still throw but with context
    throw new Error(`Failed to check account: ${err?.message || String(err)}`)
  }
  
  let attempt = 0
  let lastError: any
  while (attempt < maxAttempts) {
    try {
      const prepared = await client.autofill(tx)
      const signed = wallet.sign(prepared)
      const result = await client.submitAndWait(signed.tx_blob)
      return result
    } catch (err: any) {
      lastError = err
      // If it's an account not found error, don't retry
      if (err?.data?.error === 'actNotFound' || err?.message?.includes('actNotFound') || err?.message?.includes('not found on the network')) {
        throw new Error(`Account ${tx.Account} not found on the network. Please fund the account first using a faucet (for testnet) or send XRP to activate it.`)
      }
      await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt)))
      attempt++
    }
  }
  throw lastError
}

export function makeJsonMemoHex(obj: any): string {
  const json = JSON.stringify(obj)
  return Buffer.from(json, 'utf8').toString('hex')
}
