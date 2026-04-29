'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CharacterData } from '@/lib/db'
import { DialogueEntry, SkillOutput, distillCharacterIteratively } from '@/lib/llmClient'
import { APIConfig, ApiConfigManager } from '@/lib/apiConfig'
import { SECTION_VARIANTS, EXPAND_VARIANTS } from '@/lib/animations'

interface DistillProgressProps {
    character: CharacterData | null
    rawText: string
    dialogues: DialogueEntry[]
    apiConfig: APIConfig
    onSkillGenerated: (skill: SkillOutput) => void
}

export default function DistillProgress({
    character,
    rawText,
    dialogues,
    apiConfig,
    onSkillGenerated
}: DistillProgressProps) {
    const [isDistilling, setIsDistilling] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [llmOutput, setLlmOutput] = useState<string | null>(null)

    const canDistill = useMemo(() => {
        const result = character &&
            dialogues.length > 0 &&
            ApiConfigManager.validate(apiConfig).valid;
        return result
    }, [character, dialogues, apiConfig])

    const handleDistill = useCallback(async () => {
        if (!character) return setError('请先选择一个角色')
        if (dialogues.length === 0) return setError('请输入角色样本')

        const validation = ApiConfigManager.validate(apiConfig)
        if (!validation.valid) return setError(validation.error || 'API 配置无效')

        setIsDistilling(true)
        setProgress(0)
        setError(null)
        setLlmOutput(null)

        try {
            setStatus('正在蒸馏...');
            setProgress(15)
            const result = await distillCharacterIteratively(
                apiConfig,
                character,
                rawText,
                (msg: string, prog: number) => {
                    setStatus(msg);
                    setProgress(prog);
                }
            );

            if (result) {
                setProgress(100)
                onSkillGenerated(result);
                setStatus('蒸馏完成！');
            }
        } catch (err) {
            setError(`蒸馏出错: ${err instanceof Error ? err.message : '未知错误'}`)
            setStatus('蒸馏失败')
        } finally {
            setIsDistilling(false)
        }
    }, [character, dialogues, apiConfig, onSkillGenerated]);

    return (
        <motion.div
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            className="space-y-4"
        >
            <button
                onClick={handleDistill}
                disabled={!canDistill || isDistilling}
                className="gs-button-primary"
            >
                {isDistilling ? (
                    <span className="flex items-center justify-center gap-2">
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        {status}
                    </span>
                ) : (
                    '开始蒸馏'
                )}
            </button>

            {!canDistill && (
                <p className="text-sm italic opacity-60 text-center">
                    请确保已选择角色、输入对话样本并配置 API
                </p>
            )}

            {isDistilling && (
                <div className="space-y-3">
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-accent-light dark:bg-accent-dark"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-sm italic opacity-60 text-center">
                        {status}
                    </p>
                </div>
            )}

            {llmOutput && (
                <motion.div
                    variants={EXPAND_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="max-h-[300px] overflow-y-auto p-4 bg-gray-100 dark:bg-gray-800
                     border border-gray-200 dark:border-gray-700"
                >
                    <p className="text-xs font-mono whitespace-pre-wrap opacity-80">
                        {llmOutput}
                    </p>
                </motion.div>
            )}

            {error && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-500"
                >
                    {error}
                </motion.p>
            )}
        </motion.div>
    )
}
