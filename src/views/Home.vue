<template>
  <div class="home-container">
    <!-- Header -->
    <header class="header flex items-center justify-center">
      <div class="header-content">
        <div class="title-section">
          <h1 class="main-title">IDNote: Making Your Story Timeless</h1>
          <p class="subtitle">Post and Share Your Story On-chain</p>
        </div>
       
      </div>
    </header>

    <!-- Content -->
    <main class="main-content flex items-center justify-center">
      <!-- 未连接提示 -->
      <div v-if="!userStore.isAuthorized" class="not-connected">
        <p>请先连接钱包以查看您的笔记</p>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="loading">
        <p>加载中...</p>
      </div>

      <!-- 笔记列表 -->
      <div v-else-if="notes.length > 0" class="notes-list items-center justify-center">
        <div
          v-for="note in notes"
          :key="note.id"
          @click="router.push(`/simpleNote/${note.id}`)"
          class="note-card"
        >
          <div class="note-header">
            <h3 class="note-title">{{ getNoteTitle(note) }}</h3>
            <div v-if="getNoteCover(note)" class="note-cover">
              <img :src="getNoteCover(note)" alt="cover" />
            </div>
          </div>
          <div class="note-footer">
            <UserAvatar
              :image="note?.userInfo?.avatar"
              :meta-id="note?.userInfo?.metaid"
              :name="note?.userInfo?.name|| note?.userInfo?.metaid?.slice(0,6)"
              :meta-name="''"
              :is-custom="false"
              class="avatar"
            />
            <span class="author">{{note?.userInfo?.name|| note?.userInfo?.metaid?.slice(0,6)}}</span>
            <span class="date">{{ formatDate(note.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p>You haven't created any notes yet. Start creating your first note now!</p>
        <button @click="router.push('/post')" class="create-btn">
         Write Note
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getAddressPinList, type PinInfo } from '@/api/ManV2'
import { useToast } from '@/components/Toast/useToast'
import { getUserInfoByAddress } from "@/api/man";
const router = useRouter()
const userStore = useUserStore()
const { showToast } = useToast()

const notes = ref<PinInfo[]>([])
const loading = ref(false)

// 获取笔记标题
const getNoteTitle = (note: PinInfo): string => {
  try {
    if (note.content) {
      const data = JSON.parse(note.contentSummary)
      return data.title || '无标题'
    }
    return '无标题'
  } catch (error) {
    return '无标题'
  }
}

// 获取笔记封面
const getNoteCover = (note: PinInfo): string => {
  try {
    if (note.content) {
      const data = JSON.parse(note.contentSummary)
      if (data.coverImg && data.coverImg.startsWith('metafile://')) {
        // 处理 metafile:// 链接
        const pinId = data.coverImg.replace('metafile://', '')
        return `https://man.metaid.io/pin/${pinId}`
      }
      return data.coverImg || ''
    }
    return ''
  } catch (error) {
    return ''
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
    minute: '2-digit'
  })
}

// 加载笔记列表
const loadNotes = async () => {
  if (!userStore.isAuthorized) {
    notes.value = []
    return
  }

  loading.value = true
  try {
    const response = await getAddressPinList({
      address:userStore.last.address,
      path: '/protocols/simplenote',
      size: 20
    })

    for(let item of response.list){
     const userInfo= await getUserInfoByAddress(item.address)
      item.userInfo=userInfo 
    }

    notes.value = response.list || []
    
  } catch (error) {
    showToast('加载笔记失败', 'error')
    console.error('Failed to load notes:', error)
  } finally {
    loading.value = false
  }
}

// 监听用户登录状态
watch(() => userStore.isAuthorized, (newVal) => {
  if (newVal) {
    loadNotes()
  } else {
    notes.value = []
  }
})

onMounted(() => {
  if (userStore.isAuthorized) {
    loadNotes()
  }
})
</script>

<style lang="scss" scoped>
.home-container {
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: center;

  flex-direction: column;
  

  box-sizing: border-box;
}

.header {


 
  width: 100%;
  padding: 3rem 2rem;


  .header-content {
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-section {
    .main-title {
      font-size: 36px;
      font-weight: 600;
      margin: 0;
      color: #333;
    }

    .subtitle {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 500;
      color: #303133;
      margin: 0.25rem 0 0 0;
    }
  }

 
}

.main-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  box-sizing: border-box;
}

.not-connected,
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

.notes-list {
  display: flex;
  flex-direction: column;
  
  gap: 1rem;
  max-width: 500px;
  width: 500px;
}

.note-card {
  width: 100%;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;

    .note-title {
      flex: 1;
      font-size: 1.125rem;
      font-weight: 500;
      margin: 0;
      color: #333;
      line-height: 1.5;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .note-cover {
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

  .note-footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #666;

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 0.25rem;
      flex-shrink: 0;
    }

    .author {
      font-weight: 500;
      color: #333;
    }

    .date {
      color: #999;
    }
  }
}

// Tablet breakpoint
@media (max-width: 1024px) {
  .header {
    .title-section {
      .main-title {
        font-size: 28px;
      }

      .subtitle {
        font-size: 20px;
      }
    }
  }

  .note-card {
    padding: 1.25rem;

    .note-header {
      .note-cover {
        width: 100px;
        height: 75px;
      }
    }
  }
}

// Mobile breakpoint
@media (max-width: 768px) {
  .header {
   
    width: 100%;

    .header-content {
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      text-align: center;
    }

    .title-section {
      .main-title {
        font-size: 20px;
      }

      .subtitle {
        font-size: 16px;
      }
    }
  }

  .main-content {
    width: 100%;
  }

  .note-card {
    padding: 1rem;

    .note-header {
      gap: 0.75rem;

      .note-title {
        font-size: 1rem;
      }

      .note-cover {
        width: 80px;
        height: 60px;
      }
    }

    .note-footer {
      gap: 0.375rem;
      font-size: 0.75rem;

      .avatar {
        width: 28px;
        height: 28px;
      }
    }
  }
}

// Small mobile breakpoint
@media (max-width: 480px) {
  .header {
    .title-section {
      .main-title {
        font-size: 18px;
      }

      .subtitle {
        font-size: 14px;
      }
    }
  }

  .note-card {
    padding: 0.75rem;

    .note-header {
      flex-direction: column;
      gap: 0.75rem;

      .note-title {
        font-size: 0.9375rem;
      }

      .note-cover {
        width: 100%;
        height: 150px;
      }
    }

    .note-footer {
      gap: 0.25rem;
      font-size: 0.6875rem;

      .avatar {
        width: 24px;
        height: 24px;
      }
    }
  }
}
</style>
