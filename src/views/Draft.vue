<template>
  <div class="draft-container">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">Draft Box</h1>
        <div class="actions">
          <button @click="router.push('/')" class="back-btn">Back</button>
          <button @click="router.push('/post')" class="create-btn">Write</button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="main-content">
      <!-- Loading -->
      <div v-if="loading" class="loading">
        <p>加载中...</p>
      </div>

      <!-- Drafts List -->
      <div v-else-if="drafts.length > 0" class="drafts-list">
        <div
          v-for="draft in drafts"
          :key="draft.id"
          class="draft-card"
        >
          <div @click="editDraft(draft.id!)" class="draft-content">
            <div class="draft-info">
              <h3 class="draft-title">{{ draft.title || '无标题' }}</h3>
              <p v-if="draft.subtitle" class="draft-subtitle">{{ draft.subtitle }}</p>
              <div class="draft-meta">
                <span class="date">最后编辑: {{ formatDate(draft.updatedAt) }}</span>
                <span v-if="draft.tags.length > 0" class="tags">
                  标签: {{ draft.tags.join(', ') }}
                </span>
              </div>
            </div>
            <div v-if="draft.coverImg" class="draft-cover">
              <img :src="draft.coverImg" alt="cover" />
            </div>
          </div>
          <div class="draft-actions">
            <button @click.stop="editDraft(draft.id!)" class="edit-btn">编辑</button>
            <button @click.stop="confirmDelete(draft.id!)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <p>No drafts yet</p>
        <button @click="router.push('/post')" class="create-btn">
          Write
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { draftDB, type DraftNote } from '@/utils/draftDB'
import { useToast } from '@/components/Toast/useToast'

const router = useRouter()
const { showToast } = useToast()

const drafts = ref<DraftNote[]>([])
const loading = ref(false)

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载草稿列表
const loadDrafts = async () => {
  loading.value = true
  try {
    drafts.value = await draftDB.getAllDrafts()
  } catch (error) {
    console.error('Failed to load drafts:', error)
    showToast('加载草稿失败', 'error')
  } finally {
    loading.value = false
  }
}

// 编辑草稿
const editDraft = (draftId: number) => {
  router.push({
    path: '/post',
    query: { draftId: draftId.toString() }
  })
}

// 确认删除
const confirmDelete = async (draftId: number) => {
  if (confirm('确定要删除这篇草稿吗？')) {
    await deleteDraft(draftId)
  }
}

// 删除草稿
const deleteDraft = async (draftId: number) => {
  try {
    await draftDB.deleteDraft(draftId)
    showToast('草稿已删除', 'success')
    await loadDrafts()
  } catch (error) {
    console.error('Failed to delete draft:', error)
    showToast('删除草稿失败', 'error')
  }
}

onMounted(() => {
  loadDrafts()
})
</script>

<style lang="scss" scoped>
.draft-container {
  min-height: 100vh;
   max-width: 1200px;
   width: 600px;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  padding: 1.5rem 2rem;

  .header-content {
  
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0;
      color: #333;
    }

    .actions {
      display: flex;
      gap: 1rem;

      .back-btn {
        padding: 0.5rem 1.25rem;
        background: #fff;
        color: #149dd3;
        border: 1px solid #149dd3;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.95rem;
        transition: all 0.2s;

        &:hover {
          background: #f0f9fc;
        }
      }

      .create-btn {
        padding: 0.5rem 1.25rem;
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
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;

  p {
    color: #666;
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .create-btn {
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

.drafts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.draft-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .draft-content {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    gap: 1.5rem;
    cursor: pointer;

    .draft-info {
      flex: 1;

      .draft-title {
        font-size: 1.125rem;
        font-weight: 500;
        margin: 0 0 0.5rem 0;
        color: #333;
      }

      .draft-subtitle {
        font-size: 0.95rem;
        color: #666;
        margin: 0 0 0.75rem 0;
        line-height: 1.5;
      }

      .draft-meta {
        display: flex;
        gap: 1.5rem;
        font-size: 0.875rem;
        color: #999;

        .tags {
          color: #149dd3;
        }
      }
    }

    .draft-cover {
      width: 120px;
      height: 90px;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 0.375rem;
      }
    }
  }

  .draft-actions {
    padding: 1rem 1.5rem;
    background: #f9f9f9;
    border-top: 1px solid #e5e5e5;
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;

    button {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .edit-btn {
      background: #fff;
      color: #149dd3;
      border: 1px solid #149dd3;

      &:hover {
        background: #f0f9fc;
      }
    }

    .delete-btn {
      background: #fff;
      color: #dc3545;
      border: 1px solid #dc3545;

      &:hover {
        background: #fff5f5;
      }
    }
  }
}

@media (max-width: 768px) {
  .header {
    padding: 1rem;

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;

      .title {
        font-size: 1.25rem;
      }

      .actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  }

  .main-content {
    padding: 1rem;
  }

  .draft-card {
    .draft-content {
      .draft-cover {
        width: 80px;
        height: 60px;
      }
    }

    .draft-actions {
      flex-wrap: wrap;
    }
  }
}
</style>
