import { XummSdk } from 'xumm-sdk'

const apiKey = process.env.XUMM_APIKEY
const apiSecret = process.env.XUMM_APISECRET

if (!apiKey || !apiSecret) {
  throw new Error(
    'XUMM_APIKEY and XUMM_APISECRET must be set in the server environment. ' +
    'Get them from https://apps.xumm.dev and add them to .env (see .env.example).'
  )
}

export const xumm = new XummSdk(apiKey, apiSecret)
