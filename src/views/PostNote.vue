<template>
  <div class="post-note-container">
    <!-- Header -->
    <header class="post-header">
      <div class="header-content">
        <button @click="handleBack" class="back-btn">Back</button>
        <div class="user-info">
            <UserAvatar
              :image="userStore.last.avatar"
              :meta-id="userStore.last.metaid"
              :name="userStore.last.name|| userStore.last.metaid?.slice(0,6)"
              :meta-name="''"
              :is-custom="false"
              class="avatar"
            />
          <span class="username">{{ userStore.last?.name || userStore.last?.metaid?.slice(0,6) }}</span>
        </div>
        <button
          @click="handlePublish"
          :disabled="publishing || !canPublish"
          class="publish-btn"
        >
          {{ publishing ? 'Publishing...' : 'Publish' }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="editor-container">
        <!-- Title Input -->
        <div class="input-section">
          <input
            v-model="title"
            @input="handleContentChange"
            type="text"
            placeholder="这里输入标题（最多允许 100 字）"
            maxlength="100"
            class="title-input"
          />
        </div>

        <!-- Subtitle Input -->
        <!-- <div class="input-section">
          <input
            v-model="subtitle"
            @input="handleContentChange"
            type="text"
            placeholder="这里输入副标题（可选）"
            maxlength="200"
            class="subtitle-input"
          />
        </div> -->

        <!-- Privacy Setting -->
        <div class="input-section">
          <div class="privacy-section">
            <label class="privacy-label">笔记可见性</label>
            <div class="privacy-options">
              <label class="privacy-option">
                <input
                  type="radio"
                  v-model="privacySetting"
                  value="public"
                  @change="handlePrivacyChange"
                />
                <span class="option-label">公开</span>
              </label>
              <label class="privacy-option">
                <input
                  type="radio"
                  v-model="privacySetting"
                  value="private"
                  @change="handlePrivacyChange"
                />
                <span class="option-label">私密</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Cover Image -->
        <div class="input-section">
          <div class="cover-section">
            <label class="cover-label">封面图片（可选）</label>
            <div v-if="coverImg" class="cover-preview">
              <img :src="coverImg" alt="cover" />
              <button @click="removeCover" class="remove-cover-btn">删除封面</button>
            </div>
            <div v-else class="cover-upload">
              <input
                type="file"
                ref="coverInput"
                @change="handleCoverUpload"
                accept="image/*"
                class="file-input"
              />
              <button @click="triggerCoverUpload" class="upload-btn">
                Upload Cover Image
              </button>
            </div>
          </div>
        </div>

        <!-- Vditor Editor -->
        <div class="editor-section">
          <div id="vditor" class="vditor-wrapper"></div>
        </div>

        <!-- Attachment Preview -->
        <AttachmentPreview
          :attachments="attachments"
          @delete="handleDeleteAttachment"
          @preview="handlePreviewAttachment"
        />

        <!-- Tags Input -->
        <div class="input-section">
          <div class="tags-section">
            <label class="tags-label">标签（可选，用逗号分隔）</label>
            <input
              v-model="tagsInput"
              @input="handleContentChange"
              type="text"
              placeholder="例如：技术, 生活, 随笔"
              class="tags-input"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/components/Toast/useToast'
import { draftDB, type MediaFile } from '@/utils/draftDB'
import { useCreateProtocols } from '@/hooks/use-create-protocols'
import AttachmentPreview from '@/components/AttachmentPreview/AttachmentPreview.vue'
import UserAvatar from '@/components/UserAvatar/UserAvatar.vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import imageCompression from 'browser-image-compression'
import {isAndroid,isIOS, useRootStore } from '@/stores/root'
import { useCryptoStore } from '@/stores/crypto'
import { encryptGCM } from '@/utils/crypto'



const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { showToast } = useToast()
const { createSimpleNote, createFile } = useCreateProtocols()
const rootStore=useRootStore()
const cryptoStore = useCryptoStore()
// 编辑器实例
let vditor: Vditor | null = null

// 表单数据
const title = ref('')
const subtitle = ref('')
const coverImg = ref('')
const coverFile = ref<Blob | null>(null)
const tagsInput = ref('')
const content = ref('')
const privacySetting = ref('public')

// 状态
const publishing = ref(false)
const currentDraftId = ref<number | null>(null)
const hasUnsavedChanges = ref(false)
const autoSaveTimer = ref<NodeJS.Timeout | null>(null)
const lastSavedContent = ref('')
const isFullscreen = ref(false)

// 附件管理
const attachments = ref<MediaFile[]>([])
const attachmentMap = ref<Map<string, number>>(new Map()) // mediafile://mediaId -> mediaFileId
const mediaUrlMap = ref<Map<string, string>>(new Map()) // mediafile://mediaId -> dataURL

// Refs
const coverInput = ref<HTMLInputElement | null>(null)

// 计算属性
const canPublish = computed(() => {
  return title.value.trim() !== '' && content.value.trim() !== ''
})

const hideToolbar=computed(()=>{
  return isAndroid || isIOS || rootStore.isWebView
})

// 初始化编辑器
const initEditor = () => {
  let toolbar
  if(hideToolbar.value){
    toolbar=[
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'line',
      'quote',
      'code',
      'inline-code',
      'link',
       '|',
      'upload',
        '|',
      'edit-mode',
      'preview',
    ]
  }else{
    toolbar=[
      'emoji',
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'line',
      'quote',
      'list',
      'ordered-list',
      'check',
      '|',
      'code',
      'inline-code',
      'link',
      'table',
      '|',
      'upload',
      '|',
      'undo',
      'redo',
      '|',
      'edit-mode',
      'preview',
      'fullscreen'
    ]
  }


  vditor = new Vditor('vditor', {
    height: 'calc(100vh - 300px)',
    minHeight: 400,
    placeholder: '这里是一个 Markdown 编辑器，支持标准的 Mark 语法',
    theme: 'classic',
    icon: 'material',
    toolbar: toolbar,
    cache: {
      enable: false
    },
    preview: {
      markdown: {
        mark: true
      },
      transform: (html: string) => {
        // 在preview渲染时，将 mediafile:// 替换为实际的 dataURL
        let transformedHtml = html
        mediaUrlMap.value.forEach((dataUrl, mediaFileUrl) => {
          const mediaId = mediaFileUrl.replace('metafile://', '')
          // 替换 src 属性中的 mediafile:// URL
          transformedHtml = transformedHtml.replace(
            new RegExp(`src="${mediaFileUrl}"`, 'g'),
            `src="${dataUrl}"`
          )
        })
        return transformedHtml
      }
    },
    upload: {
      handler: async (files: File[]) => {
        const file = files[0]
        if (!file) return null

        try {

          // 压缩图片
          const compressedFile = await compressImage(file)

          // 转换为 base64 data URL
          const dataUrl = await blobToDataURL(compressedFile)

          // 如果还没有草稿 ID，先创建一个草稿
          if (!currentDraftId.value) {
            const draftId = await draftDB.saveDraft({
              title: title.value,
              subtitle: subtitle.value,
              coverImg: coverImg.value,
              content: content.value,
              tags: parseTags(),
              createdAt: Date.now(),
              updatedAt: Date.now()
            })
            currentDraftId.value = draftId
          }

          // 保存媒体文件到 IndexedDB
          const mediaId = await draftDB.saveMediaFile({
            draftId: currentDraftId.value,
            blobUrl: dataUrl, // 保存 data URL
            file: compressedFile,
            type: file.type,
            name: file.name,
            createdAt: Date.now()
          })

          // 生成 mediafile:// 格式的URL
          const mediaFileUrl = `metafile://${mediaId}`

          // 保存到内存映射
          attachmentMap.value.set(mediaFileUrl, mediaId)
          mediaUrlMap.value.set(mediaFileUrl, dataUrl)
          attachments.value.push({
            id: mediaId,
            draftId: currentDraftId.value,
            blobUrl: dataUrl, // 保存 data URL 到 IndexedDB
            file: compressedFile,
            type: file.type,
            name: file.name,
            createdAt: Date.now()
          })

          handleContentChange()
          // 返回 mediafile:// 格式的URL给编辑器
          return JSON.stringify({ data: { succMap: { [file.name]: mediaFileUrl } } })
        } catch (error) {
          console.error('Upload failed:', error)
          showToast('上传失败', 'error')
          return null
        }
      }
    },
    after: () => {
      if (vditor) {
        vditor.setValue(content.value || '')

        // 监听全屏状态变化
        const vditorElement = document.getElementById('vditor')
        if (vditorElement) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'class') {
                const target = mutation.target as HTMLElement
                isFullscreen.value = target.classList.contains('vditor--fullscreen')
              }
            })
          })

          observer.observe(vditorElement, {
            attributes: true,
            attributeFilter: ['class']
          })
        }
      }
    },
    input: (value: string) => {
      content.value = value
      handleContentChange()
    }
  })
}

// 压缩图片
const compressImage = async (file: File): Promise<Blob> => {
  if (!file.type.startsWith('image/')) {
    return file
  }

  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: false // Disabled to avoid CSP issues with blob URLs
    }
    return await imageCompression(file, options)
  } catch (error) {
    console.error('Image compression failed:', error)
    return file
  }
}

// 将 Blob 转换为 base64 data URL
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to convert blob to data URL'))
    }
    reader.readAsDataURL(blob)
  })
}

// 触发封面上传
const triggerCoverUpload = () => {
  coverInput.value?.click()
}

// 处理封面上传
const handleCoverUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const compressedFile = await compressImage(file)
    const dataUrl = await blobToDataURL(compressedFile)

    coverImg.value = dataUrl
    coverFile.value = compressedFile

    handleContentChange()
  } catch (error) {
    console.error('Cover upload failed:', error)
    showToast('封面上传失败', 'error')
  }
}

// 删除封面
const removeCover = () => {
  // data URL 不需要手动释放，直接清空即可
  coverImg.value = ''
  coverFile.value = null
  handleContentChange()
}

// 删除附件
const handleDeleteAttachment = async (mediaId: number) => {
  try {
    // 从数组中移除
    const index = attachments.value.findIndex(m => m.id === mediaId)
    if (index !== -1) {
      const mediaFileUrl = `metafile://${mediaId}`

      // 从映射中移除
      attachmentMap.value.delete(mediaFileUrl)
      mediaUrlMap.value.delete(mediaFileUrl)

      // 从attachments数组中移除
      attachments.value.splice(index, 1)

      // 从编辑器内容中移除对应的图片标记
      if (vditor) {
        const currentContent = vditor.getValue()
        const imgRegex = new RegExp(`!\\[.*?\\]\\(${mediaFileUrl}\\)`, 'g')
        const updatedContent = currentContent.replace(imgRegex, '')
        vditor.setValue(updatedContent)
        content.value = updatedContent
      }

      // 从 IndexedDB 中删除
      if (currentDraftId.value) {
        await draftDB.deleteMediaFile(mediaId)
      }

      handleContentChange()
      showToast('附件已删除', 'success')
    }
  } catch (error) {
    console.error('Delete attachment failed:', error)
    showToast('删除附件失败', 'error')
  }
}

// 预览附件
const handlePreviewAttachment = (attachment: MediaFile) => {
  const fileType = getFileType(attachment.type)
  const previewWindow = window.open('', '_blank')

  if (!previewWindow) return

  let content = ''

  switch (fileType) {
    case 'image':
      content = `
        <img src="${attachment.blobUrl}" alt="${attachment.name}" />
      `
      break
    case 'video':
      content = `
        <video src="${attachment.blobUrl}" controls autoplay style="max-width: 100%; max-height: 100vh;">
          Your browser does not support the video tag.
        </video>
      `
      break
    case 'audio':
      content = `
        <div style="text-align: center;">
          <h2 style="color: #fff; margin-bottom: 2rem;">${attachment.name}</h2>
          <audio src="${attachment.blobUrl}" controls autoplay style="width: 100%; max-width: 500px;">
            Your browser does not support the audio tag.
          </audio>
        </div>
      `
      break
    case 'pdf':
      content = `
        <iframe src="${attachment.blobUrl}" style="width: 100%; height: 100vh; border: none;">
          Your browser does not support PDFs.
          <a href="${attachment.blobUrl}" download="${attachment.name}">Download the PDF</a>
        </iframe>
      `
      break
    default:
      content = `
        <div style="text-align: center; color: #fff;">
          <h2>${attachment.name}</h2>
          <p style="margin: 2rem 0;">此文件类型无法预览</p>
          <a href="${attachment.blobUrl}" download="${attachment.name}"
             style="color: #149dd3; text-decoration: none; font-size: 1.1rem;">
            点击下载文件
          </a>
        </div>
      `
  }

  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${attachment.name}</title>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `)
  previewWindow.document.close()
}

// 获取文件类型
const getFileType = (mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'document' => {
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType.startsWith('video/')) {
    return 'video'
  } else if (mimeType.startsWith('audio/')) {
    return 'audio'
  } else if (mimeType === 'application/pdf') {
    return 'pdf'
  }
  return 'document'
}

// 内容变化处理
const handleContentChange = () => {
  hasUnsavedChanges.value = true
}

// 隐私设置变化处理
const handlePrivacyChange = () => {
  handleContentChange()
}

// 自动保存草稿
const autoSaveDraft = async () => {
  
  if (!hasUnsavedChanges.value) return

  const currentContent = JSON.stringify({
    title: title.value,
    subtitle: subtitle.value,
    coverImg: coverImg.value,
    content: content.value,
    tags: parseTags()
    
  })

  if (currentContent === lastSavedContent.value) {
    hasUnsavedChanges.value = false
    return
  }

  try {
    const draftId = await draftDB.saveDraft({
      id: currentDraftId.value || undefined,
      title: title.value,
      subtitle: subtitle.value,
      coverImg: coverImg.value,
      content: content.value,
      tags: parseTags(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })

    if (!currentDraftId.value) {
      currentDraftId.value = draftId
    }

    lastSavedContent.value = currentContent
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Auto save failed:', error)
  }
}

// 启动自动保存定时器
const startAutoSave = () => {
  autoSaveTimer.value = setInterval(() => {
    autoSaveDraft()
  }, 5000)
}

// 停止自动保存定时器
const stopAutoSave = () => {
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
}

// 解析标签
const parseTags = (): string[] => {
  if (!tagsInput.value.trim()) return []
  return tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
}

// 加载草稿
const loadDraft = async (draftId: number) => {
  try {
    const draft = await draftDB.getDraft(draftId)
    if (!draft) {
      showToast('草稿不存在', 'error')
      return
    }

    currentDraftId.value = draftId
    title.value = draft.title
    subtitle.value = draft.subtitle || ''
    coverImg.value = draft.coverImg || ''
    content.value = draft.content
    tagsInput.value = draft.tags.join(', ')

    // 加载草稿的媒体文件
    attachments.value = await draftDB.getMediaFilesByDraftId(draftId)
    attachments.value.forEach(media => {
      if (media.id) {
        const mediaFileUrl = `metafile://${media.id}`
        attachmentMap.value.set(mediaFileUrl, media.id)
        mediaUrlMap.value.set(mediaFileUrl, media.blobUrl)
      }
    })

    // 设置编辑器内容
    if (vditor) {
      vditor.setValue(content.value)
    }

    lastSavedContent.value = JSON.stringify({
      title: title.value,
      subtitle: subtitle.value,
      coverImg: coverImg.value,
      content: content.value,
      tags: parseTags()
    })
  } catch (error) {
    console.error('Failed to load draft:', error)
    showToast('加载草稿失败', 'error')
  }
}

// 发布文章
const handlePublish = async () => {
  if (!canPublish.value) {
    showToast('请填写标题和内容', 'warning')
    return
  }

  if (!userStore.isAuthorized) {
    showToast('请先连接钱包', 'warning')
    return
  }

  publishing.value = true

  try {
    // 1. 处理附件：将内容中的 data URL 替换为 metafile URL
    let processedContent = content.value
    const attachmentPinIds: string[] = []

    // 2. 上传封面图片（如果有）
    let finalCoverImg = coverImg.value
    if (coverFile.value) {
      const coverPinId = await uploadFile(coverFile.value)
      finalCoverImg = `metafile://${coverPinId}`
    }

    // 3. 直接遍历 attachments 数组上传所有附件
    if (attachments.value.length > 0) {
      for (const mediaFile of attachments.value) {
        if (mediaFile.id) {
          // 生成原始的 mediafile URL
          const mediaFileUrl = `metafile://${mediaFile.id}`

          // 上传附件
          const pinId = await uploadFile(mediaFile.file)
          const metafileUrl = `metafile://${pinId}`

          // 保存 PINID 到数组
          attachmentPinIds.push(metafileUrl)

          // 替换内容中的 metafile://mediaId 为 metafile://pinId
          processedContent = processedContent.replace(
            new RegExp(mediaFileUrl, 'g'),
            metafileUrl
          )
        }
      }
    }

    // 4. 根据隐私设置确定加密方式
    let finalContent = processedContent
    let encryption = '0'

    if (privacySetting.value === 'private') {
      encryption = 'ase'

      // 获取签名密钥
      let sigKey = cryptoStore.queryCurrentSigKey
      
      if (!sigKey) {
        // 如果没有签名密钥，先签名
      sigKey =  await cryptoStore.signMessageAndStore()
        
      }

      if (sigKey) {
        try {
          // 加密内容
          finalContent = await encryptGCM(processedContent, sigKey)
        } catch (error) {
          console.error('加密失败:', error)
          showToast('加密失败，将发布为公开笔记', 'warning')
          encryption = '0'
        }
      } else {
        showToast('无法获取签名密钥，将发布为公开笔记', 'warning')
        encryption = '0'
      }
    }

    // 5. 构建笔记数据
    const noteBody = {
      title: title.value,
      subtitle: subtitle.value,
      coverImg: finalCoverImg,
      contentType: 'text/markdown',
      content: finalContent,
      encryption: encryption,
      createTime: Date.now(),
      tags: parseTags(),
      attachments: attachmentPinIds
    }

    // 6. 发布笔记
    const metaidData = {
      path: '/protocols/simplenote',
      body: noteBody,
      contentType: 'application/json',
      encoding: 'utf-8' as const,
      version: '1.0.0',
      operation: 'create' as const
    }

    const result = await createSimpleNote(metaidData)

    if (result) {
      showToast('笔记发布成功！', 'success')

      // 删除草稿
      if (currentDraftId.value) {
        await draftDB.deleteDraft(currentDraftId.value)
      }

      // 跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
  } catch (error: any) {
    console.error('Publish failed:', error)
    showToast(error.message || '发布失败', 'error')
  } finally {
    publishing.value = false
  }
}

// 上传文件到链上
const uploadFile = async (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)
        const hexString = Array.from(uint8Array)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // 计算 SHA256
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        // 获取文件名（如果是 File 对象）
        const fileName = (file as File).name || 'unnamed_file'

        const metaidData = {
          path: '/file',
          body: '',
          contentType: file.type || 'application/octet-stream',
          encoding: 'binary' as const,
          version: '1.0.0',
          operation: 'create' as const
        }

        const options = {
          chain: 'mvc' as const,
          network: 'mainnet' as const,
          mime: file.type || 'application/octet-stream',
          attachments: [{
            fileName: fileName,
            fileType: file.type || 'application/octet-stream',
            data: hexString,
            encrypt: 0 as const,
            sha256: sha256,
            size: file.size,
            url: ''
          }]
        }

        const result = await createFile(metaidData, options)

        if (result && result.txid) {
          resolve(`${result.txid}i0`)
        } else {
          reject(new Error('文件上传失败'))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 返回处理
const handleBack = async () => {
  if (hasUnsavedChanges.value) {
    if (confirm('有未保存的更改，是否保存为草稿？')) {
      await autoSaveDraft()
    }
  }
  router.push('/')
}

// 页面离开前保存
const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    await autoSaveDraft()
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  initEditor()
  startAutoSave()

  // 检查是否从草稿箱进入
  const draftId = route.query.draftId
  if (draftId) {
    loadDraft(parseInt(draftId as string))
  }

  // 监听页面离开
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  stopAutoSave()
  window.removeEventListener('beforeunload', handleBeforeUnload)

  // 保存草稿
  if (hasUnsavedChanges.value) {
    autoSaveDraft()
  }

  // 销毁编辑器
  if (vditor) {
    vditor.destroy()
    vditor = null
  }

  // data URL 不需要手动清理，自动垃圾回收
})
</script>

<style lang="scss" scoped>
.post-note-container {
  min-height: 100vh;
 
}

.post-header {
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .back-btn {
      padding: 0.5rem 1.25rem;
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;

      &:hover {
        background: #f5f5f5;
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .username {
        font-size: 0.95rem;
        color: #333;
        font-weight: 500;
      }
    }

    .publish-btn {
      padding: 0.5rem 1.5rem;
      background: #149dd3;
      color: #fff;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #1189bd;
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.editor-container {
  background: #fff;
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  // Remove fullscreen-mode styles to prevent container size issues
  // Vditor handles fullscreen internally with .vditor--fullscreen
}

.input-section {
  margin-bottom: 1.5rem;

  .title-input,
  .subtitle-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1.125rem;
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: #149dd3;
    }
  }

  .title-input {
    font-weight: 600;
    font-size: 1.5rem;
  }

  .subtitle-input {
    color: #666;
  }
}

.cover-section {
  .cover-label {
    display: block;
    font-size: 0.95rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .cover-preview {
    position: relative;
    max-width: 150px;


    img {
      width: 100%;
      border-radius: 0.375rem;
      object-fit: cover;
    }

    .remove-cover-btn {
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: #dc3545;
      color: #fff;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;

      &:hover {
        background: #c82333;
      }
    }
  }

  .cover-upload {
    .file-input {
      display: none;
    }

    .upload-btn {
      padding: 0.75rem 1.5rem;
      background: #149dd3;
      color: #fff;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.2s;

      &:hover {
        background: #1189bd;
      }
    }
  }
}

.editor-section {
  margin-bottom: 1.5rem;

  .vditor-wrapper {
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    overflow: hidden;
  }
}

.privacy-section {
  .privacy-label {
    display: block;
    font-size: 0.95rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .privacy-options {
    display: flex;
    gap: 1.5rem;

    .privacy-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;

      input[type="radio"] {
        margin: 0;
        cursor: pointer;
      }

      .option-label {
        font-size: 0.95rem;
        color: #333;
        user-select: none;
      }

      &:hover .option-label {
        color: #149dd3;
      }
    }
  }
}

.tags-section {
  .tags-label {
    display: block;
    font-size: 0.95rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .tags-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.95rem;
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    outline: none;
    transition: all 0.2s;

    &:focus {
      border-color: #149dd3;
    }
  }
}

// vditor 全屏模式 z-index 控制
:deep(.vditor--fullscreen) {
  z-index: 999 !important;
}

@media (max-width: 768px) {
  .post-header  {
    padding: 1rem;

    .header-content {
      .user-info {
        .username {
          display: none;
        }
      }
    }
  }

  .main-content {
    padding: 1rem;
  }

  .editor-container {
    padding: 1rem;
  }

  .input-section {
    .title-input {
      font-size: 1.25rem;
    }
  }
}
</style>
