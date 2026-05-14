'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBox from '@/components/SearchBox'
import DialogueInput from '@/components/DialogueInput'
import ModelConfig from '@/components/ModelConfig'
import DistillProgress from '@/components/DistillProgress'
import SkillExport from '@/components/SkillExport'
import CharacterDetail from '@/components/CharacterDetail'
import { CharacterData } from '@/lib/db'
import { DialogueEntry, SkillOutput } from '@/lib/llmClient'
import { APIConfig } from '@/lib/apiConfig'
import { SECTION_VARIANTS } from '@/lib/animations'
import SiteIcon from '@/components/SiteIcon'

export default function Home() {
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null)
    const [dialogues, setDialogues] = useState<DialogueEntry[]>([])
    const [rawText, setRawText] = useState('')
    const [apiConfig, setApiConfig] = useState<APIConfig>({
        baseUrl: '',
        modelName: '',
        apiKey: ''
    })
    const [generatedSkill, setGeneratedSkill] = useState<SkillOutput | null>(null)

    const handleCharacterSelect = useCallback((character: CharacterData) => {
        setSelectedCharacter(character)
        setGeneratedSkill(null)
    }, [])

    const handleDialoguesChange = useCallback((newDialogues: DialogueEntry[], rawText: string) => {
        setRawText(rawText)
        setDialogues(newDialogues)
        setGeneratedSkill(null)
    }, [])

    const handleApiConfigChange = useCallback((config: APIConfig) => {
        setApiConfig(config)
    }, [])

    const handleSkillUpdate = useCallback((skill: SkillOutput) => {
        setGeneratedSkill(skill)
    }, [])

    const handleDetailClosed = useCallback(() => {
        setSelectedCharacter(null)
        setGeneratedSkill(null)
        setDialogues([])
    }, [])

    return (
        <main className="space-y-16">
            <motion.header
                variants={SECTION_VARIANTS}
                initial="initial"
                animate="animate"
                className="text-center space-y-4"
            >
                <SiteIcon className="mx-auto w-32" />
                <h1 className="font-serif text-5xl tracking-wide">
                    GalSkill
                </h1>
                <p className="text-sm text-olive">
                    角色 Skill 蒸馏工具 · 将角色数据转化为 Skill
                </p>
            </motion.header>

            <hr className="divider !mt-6" />

            <section className="space-y-5">
                <h2 className="section-title">模型配置</h2>
                <ModelConfig onConfigChange={handleApiConfigChange} />
            </section>

            <section className="space-y-5">
                <h2 className="section-title">搜索角色</h2>
                <SearchBox onCharacterSelect={handleCharacterSelect} />
            </section>

            {selectedCharacter && (
                <>
                    <hr className="divider-dotted" />

                    <AnimatePresence mode="wait">
                        <motion.section
                            key={selectedCharacter.id}
                            variants={SECTION_VARIANTS}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-5"
                        > 
                            <CharacterDetail
                                    character={selectedCharacter}
                                    onClose={handleDetailClosed}
                            />
                            <DialogueInput
                                    character={selectedCharacter}
                                    onDialoguesChange={handleDialoguesChange}
                            />
                            <DistillProgress
                                    character={selectedCharacter}
                                    rawText={rawText}
                                    dialogues={dialogues}
                                    apiConfig={apiConfig}
                                    onSkillGenerated={handleSkillUpdate}
                            />
                            <SkillExport
                                    skill={generatedSkill}
                                    character={selectedCharacter}
                                    onSkillChange={handleSkillUpdate}
                            />
                        </motion.section>
                    </AnimatePresence>
                </>
            )}

            <hr className="divider" />
            <motion.footer
                variants={SECTION_VARIANTS}
                initial="initial"
                animate="animate"
                className="text-center pt-8 space-y-3"
            >
                <p className="text-xs text-stone">
                    GalSkill · 译作心之痕迹
                </p>
                <p className="text-xs text-stone flex justify-center gap-x-2">
                    <span>数据来源:</span>
                    <a href="https://bgm.tv/" target="_blank" rel="noopener noreferrer" className="gs-link">
                        Bangumi
                    </a>
                    <span>·</span>
                    <a href="https://vndb.org/" target="_blank" rel="noopener noreferrer" className="gs-link">
                        VNDB
                    </a>
                    <span>·</span>
                    <a href="https://wikipedia.org/wiki/" target="_blank" rel="noopener noreferrer" className="gs-link">
                        维基百科
                    </a>
                </p>
            </motion.footer>
        </main>
    )
}
