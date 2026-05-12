'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CharacterData } from '@/lib/db'
import { DialogueEntry, SkillOutput, distillCharacterIteratively } from '@/lib/llmClient'
import { APIConfig, ApiConfigManager } from '@/lib/apiConfig'
import { SECTION_VARIANTS } from '@/lib/animations'
import Spinner from '@/components/Spinner'

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

    const canDistill = character && dialogues.length > 0 && ApiConfigManager.validate(apiConfig).valid

    const handleDistill = useCallback(async () => {
        if (!character) return setError('请先选择一个角色')
        if (dialogues.length === 0) return setError('请输入角色样本')

        const validation = ApiConfigManager.validate(apiConfig)
        if (!validation.valid) return setError(validation.error || 'API 配置无效')

        setIsDistilling(true)
        setProgress(0)
        setError(null)

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
    }, [character, rawText, dialogues, apiConfig, onSkillGenerated]);

    return (
        <motion.section
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            className="space-y-6"
        >
            <h2 className="section-title">蒸馏角色 Skill</h2>
            <button
                onClick={handleDistill}
                disabled={!canDistill || isDistilling}
                className="btn-primary"
            >
                {isDistilling ? (
                    <span className="flex items-center justify-center gap-2">
                        <Spinner />
                        {status}
                    </span>
                ) : (
                    '开始蒸馏'
                )}
            </button>

            {!canDistill && (
                <p className="text-sm font-sans text-center text-stone">
                    请确保已选择角色、输入对话样本并配置 API
                </p>
            )}

            {isDistilling && (
                <div className="space-y-3">
                    <div className="h-2 rounded-full overflow-hidden bg-sand">
                        <motion.div
                            className="h-full rounded-full bg-brand"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <p className="text-sm text-center text-olive">{status}</p>
                </div>
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
        </motion.section>
    )
}
