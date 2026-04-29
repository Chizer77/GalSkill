'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CharacterData } from '@/lib/db'
import { parseDialogueInput, DialogueEntry, getCharacterNames } from '@/lib/llmClient'
import { SECTION_VARIANTS, EXPAND_VARIANTS } from '@/lib/animations'

interface DialogueInputProps {
    character: CharacterData
    onDialoguesChange: (dialogues: DialogueEntry[], rawText: string) => void
}

export default function DialogueInput({ character, onDialoguesChange }: DialogueInputProps) {
    const [input, setInput] = useState('')
    const [dialogues, setDialogues] = useState<DialogueEntry[]>([])
    const names = getCharacterNames(character)
    const primaryName = names[0] || '未知角色'

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInput(value)

        const parsed = parseDialogueInput(primaryName, value)
        setDialogues(parsed)
        onDialoguesChange(parsed, value)
    }, [onDialoguesChange])

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            setInput(prev => prev + (prev ? '\n' : '') + text)
            const parsed = parseDialogueInput(primaryName, text)
            setDialogues(parsed)
            onDialoguesChange(parsed, text)
        }
        reader.readAsText(file)

        e.target.value = ''
    }, [onDialoguesChange])

    const handleClear = useCallback(() => {
        setInput('')
        setDialogues([])
        onDialoguesChange([], '')
    }, [onDialoguesChange])

    return (
        <motion.div
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            className="space-y-4"
        >
            <div className="flex justify-between items-center">
                <h2 className="gs-section-title">角色样本</h2>
                <div className="flex gap-2">
                    <label className="gs-button-secondary">
                        <input
                            type="file"
                            accept=".txt,.json"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        上传文件
                    </label>
                    {dialogues.length > 0 && (
                        <button
                            onClick={handleClear}
                            className="px-3 py-1.5 text-sm opacity-60 hover:opacity-100
                         transition-opacity duration-200"
                        >
                            清空
                        </button>
                    )}
                </div>
            </div>

            <textarea
                value={input}
                onChange={handleInputChange}
                placeholder={`粘贴角色语料片段...
  
格式示例：
「这是日系对话内容」
“这是中文对话内容”
"This is English dialogue"
（角色轻轻喝了一口红茶）—— 旁白与动作描写也会用于分析。

※ 系统会自动识别不同引号，并结合背景叙述分析角色。
        `}
                className="gs-input min-h-[250px] font-serif leading-relaxed"
            />

            {dialogues.length > 0 && (
                <motion.div
                    variants={EXPAND_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-2"
                >
                    <p className="text-sm opacity-60">
                        已解析 {dialogues.length} 条对话
                    </p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {dialogues.slice(0, 50).map((d, idx) => (
                            <div key={idx} className="text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                                <span className="font-semibold opacity-70">{d.speaker}: </span>
                                <span className="opacity-80">{d.text}</span>
                            </div>
                        ))}
                        {dialogues.length > 50 && (
                            <p className="text-xs opacity-50">
                                还有 {dialogues.length - 50} 条对话...
                            </p>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}

