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
    <button @click="handleBack" class="back-button" title="返回上一页">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Back</span>
    </button>

      <!-- Header -->
      <header class="note-header">
        <h1 class="title">{{ noteData.title }}</h1>
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
          <div class="note-id">
            <span class="label">TXID:</span>
            <span class="value">{{ note?.id.slice(0, 12) }}...</span>
            <button @click="copyNoteId" class="copy-btn" title="复制完整 TXID">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 5.5H6.5C5.94772 5.5 5.5 5.94772 5.5 6.5V13.5C5.5 14.0523 5.94772 14.5 6.5 14.5H13.5C14.0523 14.5 14.5 14.0523 14.5 13.5V6.5C14.5 5.94772 14.0523 5.5 13.5 5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.5 10.5H2.5C2.23478 10.5 1.98043 10.3946 1.79289 10.2071C1.60536 10.0196 1.5 9.76522 1.5 9.5V2.5C1.5 2.23478 1.60536 1.98043 1.79289 1.79289C1.98043 1.60536 2.23478 1.5 2.5 1.5H9.5C9.76522 1.5 10.0196 1.60536 10.2071 1.79289C10.3946 1.98043 10.5 2.23478 10.5 2.5V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
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
const route = useRoute()
const router = useRouter()
const { showToast } = useToast()

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
}

const noteData = ref<NoteContent | null>(null)
const noteUserInfo=ref<UserInfo | null>(null)
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

// 复制 Note ID
const copyNoteId = async () => {
  if (!note.value?.id) {
    showToast('暂无可复制的 TXID', 'error')
    return
  }

  try {
    await navigator.clipboard.writeText(note.value.id.slice(0,-2))
    showToast('TXID 已复制到剪贴板', 'success')
  } catch (err) {
    // 如果 clipboard API 不可用，使用备用方案
    const textArea = document.createElement('textarea')
    textArea.value = note.value.id
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      showToast('TXID 已复制到剪贴板', 'success')
    } catch (e) {
      showToast('复制失败，请手动复制', 'error')
    }
    document.body.removeChild(textArea)
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
        noteUserInfo.value=await getUserInfoByAddress(note.value.address)
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

    .title {
      font-size: 2rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #333;
      line-height: 1.4;
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

        .copy-btn {
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
