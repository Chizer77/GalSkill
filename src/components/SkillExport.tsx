'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { SkillOutput, getCharacterNames } from '@/lib/llmClient'
import { CharacterData } from '@/lib/db'
import { SECTION_VARIANTS, EXPAND_VARIANTS } from '@/lib/animations'

type FileType = 'identity' | 'knowledge' | 'relations' | 'styleGuide'

interface FileInfo {
    key: FileType
    name: string
    description: string
    isJson: boolean
}

const FILES: FileInfo[] = [
    { key: 'identity', name: 'identity.json', description: '核心性格与口癖', isJson: true },
    { key: 'knowledge', name: 'knowledge.json', description: '世界观与背景', isJson: true },
    { key: 'relations', name: 'relations.md', description: '角色关系网', isJson: false },
    { key: 'styleGuide', name: 'style_guide.md', description: '对话规范', isJson: false },
]

interface SkillExportProps {
    skill: SkillOutput | null
    character: CharacterData | null
    onSkillChange?: (skill: SkillOutput) => void
}

export default function SkillExport({ skill, character, onSkillChange }: SkillExportProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [exportStatus, setExportStatus] = useState('')
    const [editingFile, setEditingFile] = useState<FileType | null>(null)
    const [editContent, setEditContent] = useState('')

    const getFileContent = useCallback((fileKey: FileType): string => {
        if (!skill) return ''

        switch (fileKey) {
            case 'identity':
                return JSON.stringify(skill.identity, null, 2)
            case 'knowledge':
                return JSON.stringify(skill.knowledge, null, 2)
            case 'relations':
                return skill.relations || ''
            case 'styleGuide':
                return skill.styleGuide || ''
            default:
                return ''
        }
    }, [skill])

    const handleFileClick = useCallback((fileKey: FileType) => {
        if (editingFile === fileKey) {
            setEditingFile(null)
        } else {
            setEditingFile(fileKey)
            setEditContent(getFileContent(fileKey))
        }
    }, [getFileContent])

    const handleSaveEdit = useCallback(() => {
        if (!skill || !editingFile || !onSkillChange) return

        const updatedSkill = { ...skill }

        try {
            if (editingFile === 'identity' || editingFile === 'knowledge') {
                updatedSkill[editingFile] = JSON.parse(editContent)
            } else if (editingFile === 'relations') {
                updatedSkill.relations = editContent
            } else if (editingFile === 'styleGuide') {
                updatedSkill.styleGuide = editContent
            }

            onSkillChange(updatedSkill)
            setEditingFile(null)
            setExportStatus('保存成功')
            setTimeout(() => setExportStatus(''), 2000)
        } catch (error) {
            console.error('Invalid JSON format:', error)
            setExportStatus('JSON 格式错误，请检查语法')
            setTimeout(() => setExportStatus(''), 3000)
        }
    }, [skill, editingFile, editContent, onSkillChange])

    const handleExport = useCallback(async () => {
        if (!skill || !character) return

        setIsExporting(true)
        setExportStatus('正在创建压缩包...')

        try {
            const zip = new JSZip()
            const names = getCharacterNames(character)
            const roleName = names[0] || 'unknown'
            const folderName = `${roleName}-skill`

            zip.file(`${folderName}/identity.json`, JSON.stringify(skill.identity, null, 2))
            zip.file(`${folderName}/knowledge.json`, JSON.stringify(skill.knowledge, null, 2))
            zip.file(`${folderName}/relations.md`, skill.relations || '# 角色关系\n\n暂无关系信息')
            zip.file(`${folderName}/style_guide.md`, skill.styleGuide || '# 对话规范\n\n暂无规范信息')

            setExportStatus('正在压缩...')

            const blob = await zip.generateAsync({ type: 'blob' })

            const fileName = `${roleName}-skill.zip`
            saveAs(blob, fileName)

            setExportStatus('导出成功！')
        } catch (error) {
            console.error('Export failed:', error)
            setExportStatus(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
        } finally {
            setIsExporting(false)
            setTimeout(() => setExportStatus(''), 3000)
        }
    }, [skill, character])

    if (!skill) {
        return null
    }

    return (
        <motion.div
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            className="space-y-4"
        >
            <h2 className="gs-section-title">Skill 导出</h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
                {FILES.map((file) => (
                    <motion.button
                        key={file.key}
                        type="button"
                        onClick={() => handleFileClick(file.key)}
                        className={`p-3 bg-accent-light/5 text-left transition-all duration-200 cursor-pointer`}
                        style={{
                            border: '1px solid var(--color-accent)',
                            color: 'var(--bg-ink)'
                        }}
                    >
                        <p className="font-serif text-sm opacity-80">{file.name}</p>
                        <p className="text-xs opacity-50 mt-0.5">{file.description}</p>
                    </motion.button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {editingFile && (
                    <motion.div
                        layout
                        variants={EXPAND_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-3"
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-serif opacity-70">{FILES.find(f => f.key === editingFile)?.name}</p>
                                <p className="text-xs font-serif opacity-50">{FILES.find(f => f.key === editingFile)?.description}</p>
                            </div>
                            <button
                                onClick={() => setEditingFile(null)}
                                className="text-xs opacity-50 hover:opacity-100 transition-opacity"
                            >
                                收起
                            </button>
                        </div>

                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="gs-input min-h-[250px] font-mono text-xs leading-relaxed"
                            spellCheck={false}
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveEdit}
                                className="gs-button-primary"
                            >
                                保存修改
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={handleExport}
                disabled={isExporting || !skill}
                className="gs-button-primary"
            >
                {isExporting ? (
                    <span className="flex items-center justify-center gap-2">
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        导出中...
                    </span>
                ) : (
                    '导出 ZIP'
                )}
            </button>

            {exportStatus && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-center opacity-80"
                >
                    {exportStatus}
                </motion.p>
            )}
        </motion.div>
    )
}
