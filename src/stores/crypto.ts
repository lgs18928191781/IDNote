import { defineStore } from 'pinia'
import { useUserStore } from './user'

export const useCryptoStore = defineStore('crypto', {
  state: () => {
    return {
      signKeys: [] as Array<{address: string, sigKey: string}>
    }
  },

  getters: {
    
    getCurrentSigKey: (state) => {
      const userStore = useUserStore()
      if (!userStore.last?.address) {
        return null
      }

      const signData = state.signKeys.find(item => item.address === userStore.last.address)
      return signData ? signData.sigKey : null
    },

    
    queryCurrentSigKey: () => {
      const userStore = useUserStore()
      if (!userStore.last?.address) {
        return null
      }
      
      try {
        const signKeysData = localStorage.getItem('signKeys')
        if (!signKeysData) {
          return null
        }

        const signKeys = JSON.parse(signKeysData) as Array<{address: string, sigKey: string}>
        const signData = signKeys.find(item => item.address === userStore.last.address)
        return signData ? signData.sigKey : null
      } catch (error) {
   
        return null
      }
    },

  
    querySigKeyByAddress: () => (address: string) => {
      try {
        const signKeysData = localStorage.getItem('signKeys')
        if (!signKeysData) {
          return null
        }

        const signKeys = JSON.parse(signKeysData) as Array<{address: string, sigKey: string}>
        const signData = signKeys.find(item => item.address === address)
        return signData ? signData.sigKey : null
      } catch (error) {
        console.error('��signKeys1%:', error)
        return null
      }
    }
  },

  actions: {

    // 签名消息并存储到localStorage
 async signMessageAndStore() {
  try {
    const userStore = useUserStore();

    if (!userStore.last?.address) {
      throw new Error('用户地址不存在');
    }

    if (!window.metaidwallet?.signMessage) {
      throw new Error('metaidwallet.signMessage 方法不可用');
    }

    const message = userStore.last.address;
    const {signature} = await window.metaidwallet.signMessage(message);
    
    // 从localStorage获取现有的signKeys数组
    const existingSignKeys = localStorage.getItem('signKeys');
    let signKeys = existingSignKeys ? JSON.parse(existingSignKeys) : [];

    // 检查是否已存在相同地址的签名
    const existingIndex = signKeys.findIndex((item: any) => item.address === message);
    const signItem = {
      address: message,
      sigKey: signature.signature.slice(0,64)
    };

    if (existingIndex >= 0) {
      // 更新现有签名
      signKeys[existingIndex] = signItem;
    } else {
      // 添加新签名
      signKeys.push(signItem);
    }

    // 存储到localStorage
    localStorage.setItem('signKeys', JSON.stringify(signKeys));

    return signature.signature.slice(0,64);
  } catch (error) {
    console.error('签名消息失败:', error);
    throw error;
  }
},
    
    refreshSignKeys() {
      try {
        const signKeysData = localStorage.getItem('signKeys')
        if (signKeysData) {
          this.signKeys = JSON.parse(signKeysData)
        }
      } catch (error) {
       
        this.signKeys = []
      }
    }
  }
})