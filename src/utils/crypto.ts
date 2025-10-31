import { enc, AES, mode, pad, } from 'crypto-js'


const Utf8 = enc.Utf8
const iv = Utf8.parse('0000000000000000')

/**
 * 生成指定长度的随机字节数组（使用浏览器 Web Crypto API）
 * @param length 字节长度
 * @returns Uint8Array
 */
function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}
export function decryptToBlob(
  encryptedData: ArrayBuffer | Uint8Array,
  secretKey: string,
  
): Blob | null {
  try {
    // 将ArrayBuffer或Uint8Array转换为hex字符串
    const uint8Array =
      encryptedData instanceof Uint8Array ? encryptedData : new Uint8Array(encryptedData)
    const hexString = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    
    const result = ecdhDecryptForPrivateImg(hexString, secretKey)

    if (!result) {
      console.error('解密失败，返回空结果')
      return null
    }

    // 解密后的数据应该是原始图片的hex格式
    // 直接转换为Blob
    return hexStringToBlob(result)
  } catch (error) {
    console.error('转换为 Blob 失败:', error)
    return null
  }
}

export function ecdhDecryptForPrivateImg(message: string, secretKey: string): string {
  try {
    // 将hex字符串转换为WordArray
    const messageWordArray = enc.Hex.parse(message)
    const secretKeyWordArray = enc.Hex.parse(secretKey)

    // 使用CipherParams创建正确的解密参数
    const cipherParams = {
      ciphertext: messageWordArray,
    } as any

    const messageBytes = AES.decrypt(cipherParams, secretKeyWordArray, {
      mode: mode.CBC,
      padding: pad.Pkcs7,
      iv: iv,
    })

    return messageBytes.toString(enc.Hex)
  } catch (error) {
    console.error('ECDH解密失败:', error)
    return ''
  }
}


/**
 * 使用十六进制密钥进行 AES-256-GCM 加密（使用 Web Crypto API）
 * @param plaintext 要加密的明文数据 (字符串)
 * @param hexKey 十六进制格式的密钥
 * @returns 加密后的数据 (base64 编码)
 */
export async function encryptGCM(plaintext: string, hexKey: string): Promise<string> {
  try {
    // 生成 12 字节的随机 IV
    const iv = randomBytes(12);
    
    // 将十六进制密钥转换为 ArrayBuffer
    const keyBuffer = hexToArrayBuffer(hexKey);

    // 检查密钥长度 (AES-256 需要 32 字节)
    if (keyBuffer.byteLength !== 32) {
      throw new Error(`密钥长度错误，期望32字节，实际${keyBuffer.byteLength}字节`);
    }

    // 导入密钥
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // 将明文转换为 Uint8Array
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);

    // 加密
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 字节的认证标签
      },
      cryptoKey,
      plaintextBuffer
    );

    // 组合 iv + 密文（密文已包含认证标签）
    const resultBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    resultBuffer.set(iv, 0);
    resultBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

    // 转换为 base64
    return arrayBufferToBase64(resultBuffer);
  } catch (error) {
    throw new Error(`AES 加密失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 使用十六进制密钥进行 AES-256-GCM 解密（使用 Web Crypto API）
 * @param ciphertext 要解密的密文数据 (base64 编码)
 * @param hexKey 十六进制格式的密钥
 * @returns 解密后的明文数据 (字符串)
 */
export async function decryptGCM(ciphertext: string, hexKey: string): Promise<string> {
  try {
    // 解码 base64
    const data = base64ToArrayBuffer(ciphertext);

    // 将十六进制密钥转换为 ArrayBuffer
    const keyBuffer = hexToArrayBuffer(hexKey);

    // 检查密钥长度 (AES-256 需要 32 字节)
    if (keyBuffer.byteLength !== 32) {
      throw new Error(`密钥长度错误，期望32字节，实际${keyBuffer.byteLength}字节`);
    }

    // 检查数据长度 (至少需要 iv + authTag)
    if (data.byteLength < 28) { // 12 (iv) + 16 (authTag) = 28
      throw new Error('密文数据太短');
    }

    // 提取 IV (前 12 字节)
    const iv = data.slice(0, 12);

    // 提取密文（包含认证标签，从第 12 字节到结尾）
    const encryptedData = data.slice(12);

    // 导入密钥
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 解密
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 字节的认证标签
      },
      cryptoKey,
      encryptedData
    );

    // 将解密后的 ArrayBuffer 转换为字符串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error(`AES 解密失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成随机 AES-256 密钥 (十六进制格式)
 * @returns 64 字符的十六进制密钥字符串
 */
export function generateAESKey(): string {
  const key = randomBytes(32); // 32 字节 = 256 位
  console.log('key', arrayToHex(key));
  return arrayToHex(key);
}

// ========== 辅助函数 ==========

/**
 * 将十六进制字符串转换为 ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  // 移除可能存在的空格和换行
  hex = hex.replace(/\s/g, '');

  if (hex.length % 2 !== 0) {
    throw new Error('十六进制字符串长度必须是偶数');
  }
  
  const buffer = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }

  return buffer;
}

/**
 * 将 Uint8Array 转换为十六进制字符串
 */
function arrayToHex(array: Uint8Array): string {
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将 ArrayBuffer 或 Uint8Array 转换为 base64 字符串
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将 base64 字符串转换为 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}


