<template>
  <div class="home-container">
    <!-- Header -->
    <header class="header flex items-center justify-center">
      <div class="header-content">
        <div class="title-section">
          <h1 class="main-title">My Notes</h1>
          <p class="subtitle">Manage Your Personal Notes</p>
        </div>

      </div>
    </header>

    <div class="back-btn">
      <button @click="handleBackToHome" class="back-button">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </button>
    </div>

    <!-- Content -->
    <main class="main-content flex items-center flex-col justify-center">
      <!-- 加载中 -->
      <div v-if="loading" class="loading">
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
            <Image v-if="getNoteCover(note)" class="note-cover"  :src="getNoteCover(note)" />
          </div>
          <div class="note-footer">
            <!-- 加载中的占位符 -->
            <template v-if="isUserInfoLoading(note.id)">
              <div class="avatar skeleton skeleton-avatar"></div>
              <span class="skeleton skeleton-text skeleton-author"></span>
              <span class="date">{{ formatDate(note.timestamp) }}</span>
            </template>
            <!-- 加载完成后显示真实数据 -->
            <template v-else>
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
            </template>
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

      <!-- 分页器 -->
      <div v-if="notes.length > 0 && totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="handlePageChange(currentPage - 1)"
        >
          上一页
        </button>

        <div class="page-numbers">
          <button
            v-for="page in getPageNumbers()"
            :key="page"
            :class="['page-number', { active: page === currentPage, ellipsis: page === -1 }]"
            :disabled="page === -1"
            @click="page !== -1 && handlePageChange(page)"
          >
            {{ page === -1 ? '...' : page }}
          </button>
        </div>

        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="handlePageChange(currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAddressPinList, type PinInfo } from '@/api/ManV2'
import { useToast } from '@/components/Toast/useToast'
import { useUserStore } from '@/stores/user'
import { useRootStore } from '@/stores/root'

const router = useRouter()
const { showToast } = useToast()
const userStore = useUserStore()
const rootStore=useRootStore()
const notes = ref<PinInfo[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20

// 计算总页数
const totalPages = computed(() => {
  if (total.value === 0 || notes.value.length === 0) return 0
  return Math.ceil(total.value / pageSize)
})

// 获取笔记标题
const getNoteTitle = (note: PinInfo): string => {
  try {
    if (note.contentSummary) {
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
    if (note.contentSummary) {
      const data = JSON.parse(note.contentSummary)
      if (data.coverImg && data.coverImg.startsWith('metafile://')) {
        // 处理 metafile:// 链接
        const pinId = data.coverImg.replace('metafile://', '')
        return `https://man.metaid.io/content/${pinId}`
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

// 判断某个 note 的 userInfo 是否正在加载
// 由于 MyNote 页面的用户信息是直接从 userStore 设置的，所以始终返回 false
const isUserInfoLoading = (_noteId: string): boolean => {
  return false
}

// 返回首页
const handleBackToHome = () => {
  router.push('/')
}

// 加载笔记列表
const loadNotes = async (page: number = 1) => {
  if (!userStore.isAuthorized) {
    showToast('Please login first', 'error')
    return
  }

  loading.value = true
  try {
    const cursor = (page - 1) * pageSize
    const response = await getAddressPinList({
      address: userStore.last.address,
      path: '/protocols/simplenote',
      size: pageSize,
      cursor: cursor
    })

    if(!response.list || !response.list.length ){
       showToast('列表数据查询为空', 'error')
        return
    }

    // 先设置笔记列表，不等待 userInfo
    notes.value = response.list || []
    total.value = response.total || 0
    currentPage.value = page

    // 异步加载每个笔记的用户信息
   if(response.list && response.list.length){
     for (let item of response.list) {
        item.userInfo=userStore.last
    }
   }

   

  } catch (error) {
    showToast('加载笔记失败', 'error')
    console.error('Failed to load notes:', error)
    
  } finally {
    loading.value = false
  }
}

// 切换页码
const handlePageChange = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }
  loadNotes(page)
  
  // 滚动到顶部
  // window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 获取要显示的页码数组
const getPageNumbers = () => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: number[] = []

  if (total <= 7) {
    // 如果总页数小于等于7，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总是显示第一页
    pages.push(1)

    if (current <= 3) {
      // 当前页在前面时
      pages.push(2, 3, 4, 5)
      pages.push(-1) // 省略号
      pages.push(total)
    } else if (current >= total - 2) {
      // 当前页在后面时
      pages.push(-1) // 省略号
      pages.push(total - 4, total - 3, total - 2, total - 1, total)
    } else {
      // 当前页在中间时
      pages.push(-1) // 省略号
      pages.push(current - 1, current, current + 1)
      pages.push(-1) // 省略号
      pages.push(total)
    }
  }

  return pages
}

onMounted(() => {
  loadNotes()
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
    display: flex;
    width: 500px;
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

// 后退按钮样式
.back-btn {
  width: 100%;
  max-width: 500px;
  margin: 0 auto 1rem;
  padding: 0 ;
  box-sizing: border-box;

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  
    
    color: #303133;
    
   
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
    font-weight: 500;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }

    &:hover {
      background: #f5f5f5;
      border-color: #149dd3;
      color: #1189bd;
    }

    &:active {
      transform: translateX(-2px);
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

// 分页器样式
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
  padding: 1rem 0;

  .page-btn {
    padding: 0.5rem 1rem;
    background: #fff;
    color: #149dd3;
    border: 1px solid #e5e5e5;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #f5f5f5;
      border-color: #149dd3;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .page-numbers {
    display: flex;
    gap: 0.25rem;

    .page-number {
      min-width: 36px;
      height: 36px;
      padding: 0.5rem;
      background: #fff;
      color: #666;
      border: 1px solid #e5e5e5;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;

      &:hover:not(:disabled):not(.active) {
        background: #f5f5f5;
        border-color: #149dd3;
      }

      &.active {
        background: #149dd3;
        color: #fff;
        border-color: #149dd3;
        font-weight: 500;
      }

      &.ellipsis {
        cursor: default;
        border-color: transparent;
        background: transparent;

        &:hover {
          background: transparent;
          border-color: transparent;
        }
      }

      &:disabled {
        cursor: not-allowed;
      }
    }
  }
}

// Skeleton loading 占位符样式
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e8e8e8 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 0.25rem;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.skeleton-text {
  display: inline-block;
  height: 1em;
  border-radius: 0.25rem;
}

.skeleton-author {
  width: 80px;
  font-weight: 500;
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
      align-items: flex-start;
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

  .back-btn {
    padding: 0 20px;

    .back-button {
      font-size: 0.75rem;
      padding: 0.375rem 0.75rem;

      svg {
        width: 1rem;
        height: 1rem;
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

  .pagination {
    gap: 0.25rem;

    .page-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .page-numbers {
      .page-number {
        min-width: 32px;
        height: 32px;
        padding: 0.375rem;
        font-size: 0.75rem;
      }
    }
  }

  // 移动端 skeleton 样式调整
  .skeleton-avatar {
    width: 28px;
    height: 28px;
  }

  .skeleton-author {
    width: 60px;
  }
}

// Small mobile breakpoint
@media (max-width: 480px) {
  .back-btn {
    padding: 0 10px;
    max-width: 95%;

    .back-button {
      font-size: 0.6875rem;
      padding: 0.25rem 0.5rem;

      svg {
        width: 0.875rem;
        height: 0.875rem;
      }
    }
  }

  .main-content {
    padding: 0 10px;
    box-sizing: border-box;
  }

  .notes-list {
    max-width: 95%;
    width: 95%;
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

  .pagination {
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.5rem 0;

    .page-btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.6875rem;
    }

    .page-numbers {
      flex-wrap: wrap;

      .page-number {
        min-width: 28px;
        height: 28px;
        padding: 0.25rem;
        font-size: 0.6875rem;
      }
    }
  }

  // 小屏幕 skeleton 样式调整
  .skeleton-avatar {
    width: 24px;
    height: 24px;
  }

  .skeleton-author {
    width: 50px;
  }
}
</style>
