<template>
  <div v-if="attachments.length > 0" class="attachment-preview">
    <div class="preview-header">
      <label class="preview-label">附件预览 ({{ attachments.length }})</label>
    </div>
    <div class="preview-list">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="preview-item"
      >
        <!-- Image Preview -->
        <div
          v-if="getFileType(attachment.type) === 'image'"
          class="preview-content preview-image"
          @click="handlePreview(attachment)"
        >
          <img
            :src="attachment.blobUrl"
            :alt="attachment.name"
          />
        </div>

        <!-- Video Preview -->
        <div
          v-else-if="getFileType(attachment.type) === 'video'"
          class="preview-content preview-video"
        >
          <video
            :src="attachment.blobUrl"
            controls
            preload="metadata"
          ></video>
        </div>

        <!-- Audio Preview -->
        <div
          v-else-if="getFileType(attachment.type) === 'audio'"
          class="preview-content preview-audio"
        >
          <div class="audio-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
          </div>
          <audio :src="attachment.blobUrl" controls class="audio-player"></audio>
        </div>

        <!-- PDF Preview -->
        <div
          v-else-if="getFileType(attachment.type) === 'pdf'"
          class="preview-content preview-document"
          @click="handlePreview(attachment)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <text x="12" y="16" text-anchor="middle" font-size="6" fill="currentColor">PDF</text>
          </svg>
        </div>

        <!-- Other Document Preview -->
        <div
          v-else
          class="preview-content preview-document"
          @click="handlePreview(attachment)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="file-type-label">{{ getFileExtension(attachment.name) }}</span>
        </div>

        <div class="preview-info">
          <span class="file-name" :title="attachment.name">{{ attachment.name }}</span>
          <span class="file-size">{{ formatFileSize(attachment.file.size) }}</span>
        </div>
        <button
          @click="handleDelete(attachment.id)"
          class="delete-btn"
          title="删除附件"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MediaFile } from '@/utils/draftDB'

interface Props {
  attachments: MediaFile[]
}

interface Emits {
  (e: 'delete', id: number): void
  (e: 'preview', attachment: MediaFile): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

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

// 获取文件扩展名
const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.')
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase()
  }
  return 'FILE'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const handleDelete = (id: number | undefined) => {
  if (id !== undefined && confirm('确定要删除这个附件吗？')) {
    emit('delete', id)
  }
}

const handlePreview = (attachment: MediaFile) => {
  emit('preview', attachment)
}
</script>

<style lang="scss" scoped>
.attachment-preview {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border: 1px solid #e5e5e5;
  border-radius: 0.375rem;

  .preview-header {
    margin-bottom: 1rem;

    .preview-label {
      font-size: 0.95rem;
      color: #666;
      font-weight: 500;
    }
  }

  .preview-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 30px;
  }

  .preview-item {
    width: 150px;
   height: 150px;
    position: relative;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    overflow: hidden;
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: #149dd3;

      .delete-btn {
        opacity: 1;
      }
    }

    .preview-content {
      width: 100px;
      height: 100px;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      cursor: pointer;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.05);
        }
      }
    }

    .preview-video {
      background: #000;
      padding: 0;

      video {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .preview-audio {
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;

      .audio-icon {
        color: #149dd3;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .audio-player {
        width: 100%;
        max-width: 180px;
      }
    }

    .preview-document {
      cursor: pointer;
      flex-direction: column;
      gap: 0.5rem;
      color: #666;
      transition: color 0.2s;

      &:hover {
        color: #149dd3;
      }

      svg {
        flex-shrink: 0;
      }

      .file-type-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: inherit;
        text-transform: uppercase;
      }
    }

    .preview-info {
      display: flex;
      flex-direction: column;
      padding: 0.75rem;
      gap: 0.25rem;

      .file-name {
        font-size: 0.875rem;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-size {
        font-size: 0.75rem;
        color: #999;
      }
    }

    .delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.5rem;
      background: rgba(220, 53, 69, 0.9);
      color: #fff;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;

      &:hover {
        background: rgba(200, 35, 51, 0.95);
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }
}

@media (max-width: 768px) {
  .attachment-preview {
    .preview-list {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .preview-item {
      .preview-content {
      
      }

      .delete-btn {
        opacity: 1;
      }
    }
  }
}
</style>
