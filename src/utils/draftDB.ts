import Dexie, { type Table } from 'dexie'

// 草稿数据结构
export interface DraftNote {
  id?: number
  title: string
  subtitle: string
  coverImg: string // data URL (base64) 或 metafile:// URL
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  pinId?: string // 如果是编辑已发布的笔记，存储原笔记的 PINID
}

// 媒体文件数据结构
export interface MediaFile {
  id?: number
  draftId: number // 关联的草稿 ID
  blobUrl: string // 本地 data URL (base64) 或 blob URL（旧数据兼容）
  file: Blob // 文件内容
  type: string // 文件类型
  name: string // 文件名
  createdAt: number
  pinId?: string // 上链后的 PINID（metafile://{txid}i0 格式）
}

// 数据库类
class DraftDatabase extends Dexie {
  drafts!: Table<DraftNote, number>
  mediaFiles!: Table<MediaFile, number>

  constructor() {
    super('IDNoteDB')

    this.version(1).stores({
      drafts: '++id, updatedAt, pinId',
      mediaFiles: '++id, draftId, blobUrl, pinId'
    })
  }

  // 保存或更新草稿
  async saveDraft(draft: Omit<DraftNote, 'id'> & { id?: number }): Promise<number> {
    const now = Date.now()
    const draftData: DraftNote = {
      ...draft,
      updatedAt: now,
      createdAt: draft.id ? (await this.drafts.get(draft.id))?.createdAt || now : now
    }

    if (draft.id) {
      await this.drafts.update(draft.id, draftData)
      return draft.id
    } else {
      return await this.drafts.add(draftData)
    }
  }

  // 获取所有草稿（按更新时间倒序）
  async getAllDrafts(): Promise<DraftNote[]> {
    return await this.drafts.orderBy('updatedAt').reverse().toArray()
  }

  // 获取单个草稿
  async getDraft(id: number): Promise<DraftNote | undefined> {
    return await this.drafts.get(id)
  }

  // 删除草稿
  async deleteDraft(id: number): Promise<void> {
    // 同时删除关联的媒体文件
    const mediaFiles = await this.mediaFiles.where('draftId').equals(id).toArray()
    for (const media of mediaFiles) {
      // 释放 blob URL（仅针对旧数据，新数据使用 data URL 无需手动释放）
      if (media.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(media.blobUrl)
      }
    }
    await this.mediaFiles.where('draftId').equals(id).delete()
    await this.drafts.delete(id)
  }

  // 保存媒体文件
  async saveMediaFile(mediaFile: Omit<MediaFile, 'id'>): Promise<number> {
    return await this.mediaFiles.add({
      ...mediaFile,
      createdAt: Date.now()
    })
  }

  // 获取草稿的所有媒体文件
  async getMediaFilesByDraftId(draftId: number): Promise<MediaFile[]> {
    return await this.mediaFiles.where('draftId').equals(draftId).toArray()
  }

  // 更新媒体文件的 PINID
  async updateMediaFilePinId(id: number, pinId: string): Promise<void> {
    await this.mediaFiles.update(id, { pinId })
  }

  // 删除媒体文件
  async deleteMediaFile(id: number): Promise<void> {
    const media = await this.mediaFiles.get(id)
    // 释放 blob URL（仅针对旧数据，新数据使用 data URL 无需手动释放）
    if (media && media.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(media.blobUrl)
    }
    await this.mediaFiles.delete(id)
  }

  // 根据 PINID 删除草稿（发布成功后）
  async deleteDraftByPinId(pinId: string): Promise<void> {
    const draft = await this.drafts.where('pinId').equals(pinId).first()
    if (draft && draft.id) {
      await this.deleteDraft(draft.id)
    }
  }
}

// 导出数据库实例
export const draftDB = new DraftDatabase()
