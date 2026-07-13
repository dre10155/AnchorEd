declare module 'qrcode-reader-vue3' {
  import { DefineComponent } from 'vue'

  export const QrcodeStream: DefineComponent<{
    onDecode?: (result: string) => void
    onInit?: (capabilities: any) => void
  }>

  export const QrcodeDropZone: DefineComponent<any>
  export const QrcodeCapture: DefineComponent<any>
}
