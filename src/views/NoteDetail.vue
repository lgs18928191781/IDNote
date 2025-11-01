<template>
  <div class="note-detail-container">
  

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <p>加载中...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="router.push('/')" class="back-btn">Back</button>
    </div>

    <!-- Detail Content -->
    <article v-else-if="noteData" class="note-detail">
        <!-- Back Button -->
   <div class="flex items-center justify-between">
     <button @click="handleBack" class="back-button" title="返回上一页">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Back</span>
    </button>

     <button @click="shareNote" class="share-btn" title="分享笔记">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5.33333C13.1046 5.33333 14 4.43792 14 3.33333C14 2.22876 13.1046 1.33333 12 1.33333C10.8954 1.33333 10 2.22876 10 3.33333C10 4.43792 10.8954 5.33333 12 5.33333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 10C5.10457 10 6 9.10457 6 8C6 6.89543 5.10457 6 4 6C2.89543 6 2 6.89543 2 8C2 9.10457 2.89543 10 4 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 14.6667C13.1046 14.6667 14 13.7712 14 12.6667C14 11.5621 13.1046 10.6667 12 10.6667C10.8954 10.6667 10 11.5621 10 12.6667C10 13.7712 10.8954 14.6667 12 14.6667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5.72667 9.04L10.28 11.6267" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.2733 4.37333L5.72667 6.96" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
   </div>

      <!-- Header -->
      <header class="note-header">
        <div class="title-row">
          <h1 class="title">{{ noteData.title }}</h1>
          <span v-if="isNoteEncrypted" class="private-tag">Private</span>
        </div>
        <p v-if="noteData.subtitle" class="subtitle">{{ noteData.subtitle }}</p>

        <div class="meta-info">
          <div class="author-info">
              <UserAvatar
              :image="noteUserInfo?.avatar"
              :meta-id="noteUserInfo?.metaid"
              :name="noteUserInfo?.name"
              :meta-name="''"
              :is-custom="false"
              class="avatar"
            />
          
            <div class="author-meta">
              <span class="author-name">{{ noteUserInfo?.name || noteUserInfo?.metaid?.slice(0, 12) + '...' }}</span>
              <span class="publish-date">{{ formatDate(note?.timestamp || 0) }}</span>
            </div>
          </div>
          <div class="note-actions">
            <div class="note-id">
              <span class="label">TXID:</span>
              <span class="value">{{ note?.id.slice(0, 12) }}...</span>
              <button @click="openNoteLink" class="link-btn" title="在 MVC Scan 查看交易">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8.66667V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V5.33333C2 4.97971 2.14048 4.64057 2.39052 4.39052C2.64057 4.14048 2.97971 4 3.33333 4H7.33333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 2H14V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M6.66667 9.33333L14 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
           
          </div>
        </div>
      </header>

      <!-- Cover Image -->
      <Image v-if="noteData.coverImg" class="cover-image"  :src="getCoverUrl(noteData.coverImg)" />
    

      <!-- Content -->
      <div class="content" v-html="renderedContent"></div>

      <!-- Edit Button (待定功能) -->
      <!-- <div v-if="canEdit" class="edit-section">
        <button @click="handleEdit" class="edit-btn">编辑</button>
      </div> -->
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPinDetail, type PinDetail } from '@/api/ManV2'
import { useToast } from '@/components/Toast/useToast'
import { marked } from 'marked'
import { type UserInfo,getUserInfoByAddress } from "@/api/man";
import { useCryptoStore } from '@/stores/crypto'
import { useUserStore } from '@/stores/user'
import { decryptGCM } from '@/utils/crypto'

const route = useRoute()
const router = useRouter()
const { showToast } = useToast()
const cryptoStore = useCryptoStore()
const userStore = useUserStore()

const note = ref<PinDetail | null>(null)
const loading = ref(false)
const error = ref('')

interface NoteContent {
  title: string
  subtitle?: string
  coverImg?: string
  content: string
  contentType: string
  attachments?: string[]
  tags?: string[]
  encryption?: string
}

const noteData = ref<NoteContent | null>(null)
const noteUserInfo=ref<UserInfo | null>(null)

// 判断笔记是否加密
const isNoteEncrypted = computed(() => {
  if (!noteData.value?.encryption) return false
  return noteData.value.encryption !== '0'
})

// 判断笔记是否属于当前用户
const isOwnNote = computed(() => {
  if (!note.value?.address || !userStore.last?.address) return false
  return note.value.address === userStore.last.address
})

// 获取封面图 URL
const getCoverUrl = (coverImg: string): string => {
  if (coverImg.startsWith('metafile://')) {
    const pinId = coverImg.replace('metafile://', '')
    return `https://man.metaid.io/content/${pinId}`
  }
  return coverImg
}

// 获取附件 URL
const getAttachmentUrl = (attachment: string): string => {
  if (attachment.startsWith('metafile://')) {
    const pinId = attachment.replace('metafile://', '')
    return `https://man.metaid.io/content/${pinId}`
  }
  return attachment
}

// 渲染 Markdown 内容，替换附件占位符
const renderedContent = computed(() => {
  if (!noteData.value) return ''

  let content = noteData.value.content

  // 替换附件占位符
  if (noteData.value.attachments && noteData.value.attachments.length > 0) {
    noteData.value.attachments.forEach((attachment, index) => {
      const attachmentUrl = getAttachmentUrl(attachment)
      // 这里需要根据实际的占位符格式来替换
      // 假设在编辑时使用了 {{attachment-0}}, {{attachment-1}} 这样的占位符
      content = content.replace(`{{attachment-${index}}}`, attachmentUrl)
    })
  }

  // 渲染 Markdown
  if (noteData.value.contentType === 'text/markdown') {
    return marked(content)
  }

  return content
})

// 解密笔记内容
const decryptNoteContent = async (encryptedContent: string): Promise<string> => {
  try {
    
    // 判断是否是自己的笔记
    if (!isOwnNote.value) {
      // 别人的笔记，无法解密
      return '此笔记内容已加密'
    }

    // 获取签名密钥
    let sigKey = cryptoStore.queryCurrentSigKey
    if (!sigKey) {
      // 如果没有签名密钥，先签名
      sigKey = await cryptoStore.signMessageAndStore()
    }

    if (!sigKey) {
      return '无法获取解密密钥'
    }

    // 解密内容
    const decryptedContent = await decryptGCM(encryptedContent, sigKey)
    return decryptedContent
  } catch (error) {
    console.error('解密失败:', error)
    return '解密失败，无法显示内容'
  }
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 打开 MVC Scan 链接
const openNoteLink = () => {
  if (!note.value?.id) {
    showToast('暂无可查看的 TXID', 'error')
    return
  }

  const txid = note.value.id.slice(0, -2)
  const url = `https://mvcscan.com/tx/${txid}`
  window.open(url, '_blank')
}

// 分享笔记
const shareNote = async () => {
  const shareUrl = window.location.href

  try {
    await navigator.clipboard.writeText(shareUrl)
    showToast('链接已复制到剪贴板', 'success')
  } catch (err) {
    showToast('复制失败，请手动复制链接', 'error')
  }
}

// 返回上一页
const handleBack = () => {
  router.push('/')
}

// 加载笔记详情
const loadNoteDetail = async () => {
  const pinId = route.params.PINID as string
  if (!pinId) {
    error.value = '笔记 ID 无效'
    return
  }

  loading.value = true
  error.value = ''

  try {
    note.value = await getPinDetail({ numberOrId: pinId })

    if (note.value.contentSummary) {
      try {
        noteData.value = JSON.parse(note.value.contentSummary)
        noteUserInfo.value = await getUserInfoByAddress(note.value.address)

        // 检查笔记是否加密
        if (noteData.value.encryption && noteData.value.encryption !== '0') {
          // 笔记已加密，需要解密
          const decryptedContent = await decryptNoteContent(noteData.value.content)
          noteData.value.content = decryptedContent
        }
      } catch (e) {
        error.value = '笔记内容格式错误'
      }
    } else {
      error.value = '笔记内容为空'
    }
  } catch (err: any) {
    error.value = err.message || '加载笔记失败'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNoteDetail()
})
</script>

<style lang="scss" scoped>
.note-detail-container {
  min-height: 100vh;
  max-width: 600px;
  width: 600px;
  padding: 0 2rem;
  position: relative;

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
   
    margin-bottom: 1rem;
    background: #fff;
    padding: 5px;
    padding-left: 0;
    border-radius: 0.5rem;
    color: #666;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f9fafb;
      border-color: #149dd3;
      color: #149dd3;
    }

    &:active {
      transform: translateX(-2px);
    }

    svg {
      display: block;
    }

    span {
      font-weight: 500;
    }
  }

      .share-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 1rem;
        
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        gap: 0.5rem;
        transition: all 0.2s;

        &:hover {
          background: #1189bd;
         
        color: #fff;
     
       
        }

        &:active {
          transform: scale(0.98);
        }

        svg {
          display: block;
        }
      }
}

.loading,
.error {
  max-width: 800px;
  margin: 4rem auto;
  text-align: center;
  padding: 2rem;
  background: #fff;
  border-radius: 0.5rem;

  p {
    color: #666;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .back-btn {
    padding: 0.75rem 2rem;
    background: #149dd3;
    color: #fff;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s;

    &:hover {
      background: #1189bd;
    }
  }
}

.note-detail {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  height: auto;
  padding: 3rem;
  

  .note-header {
    margin-bottom: 2rem;
    margin-top: 1rem;
    .title-row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .title {
      font-size: 2rem;
      font-weight: 600;
      margin: 0;
      color: #333;
      line-height: 1.4;
      flex: 1;
    }

    .private-tag {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.375rem;
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .subtitle {
      font-size: 1.125rem;
      color: #666;
      margin: 0 0 1.5rem 0;
      line-height: 1.6;
    }

    .meta-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #e5e5e5;

      .author-info {
        display: flex;
        gap: 0.75rem;
        align-items: center;

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 0.375rem;
        }

        .author-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          .author-name {
            font-weight: 500;
            color: #333;
            font-size: 0.95rem;
          }

          .publish-date {
            font-size: 0.875rem;
            color: #999;
          }
        }
      }

      .note-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .note-id {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;

        .label {
          color: #999;
        }

        .value {
          color: #666;
          font-family: monospace;
        }

        .link-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: all 0.2s;

          &:hover {
            color: #149dd3;
            background: #f0f9ff;
          }

          &:active {
            transform: scale(0.95);
          }

          svg {
            display: block;
          }
        }
      }

    }
  }

  .cover-image {
    margin-bottom: 2rem;
    border-radius: 0.5rem;
    overflow: hidden;
   
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    background: hsl(0, 0%, 96%);
    object-fit: contain;

    // img {
    //   width: 100%;
    //   height: auto;
    //   object-fit: contain;
    // }
  }

  .content {
    font-size: 1rem;
    line-height: 1.8;
    color: #333;

    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      font-weight: 600;
      line-height: 1.4;
    }

    :deep(p) {
      margin-bottom: 1rem;
    }

    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: 0.375rem;
      margin: 1rem 0;
    }

    :deep(code) {
      background: #f5f5f5;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.9em;
    }

    :deep(pre) {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 0.375rem;
      overflow-x: auto;
      margin: 1rem 0;

      code {
        background: none;
        padding: 0;
      }
    }

    :deep(blockquote) {
      border-left: 4px solid #149dd3;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #666;
    }

    :deep(ul),
    :deep(ol) {
      padding-left: 2rem;
      margin-bottom: 1rem;
    }

    :deep(li) {
      margin-bottom: 0.5rem;
    }
  }

  .edit-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e5e5;
    text-align: center;

    .edit-btn {
      padding: 0.75rem 2rem;
      background: #149dd3;
      color: #fff;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;

      &:hover {
        background: #1189bd;
      }
    }
  }
}

@media (max-width: 768px) {
  .note-detail-container {
    padding: 1rem;

    .back-button {
      margin-bottom: 0.75rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      padding-left: 0;
      svg {
        width: 18px;
        height: 18px;
      }
    }
  }

  .note-detail {
    padding: 1.5rem;

    .note-header {
      .title {
        font-size: 1.5rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .meta-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  }
}
</style>
