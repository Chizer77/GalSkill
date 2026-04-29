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

    const handleSkillGenerated = useCallback((skill: SkillOutput) => {
        setGeneratedSkill(skill)
    }, [])

    const handleSkillChange = useCallback((skill: SkillOutput) => {
        setGeneratedSkill(skill)
    }, [])

    const handleDetailClosed = useCallback(() => {
        setSelectedCharacter(null)
        setGeneratedSkill(null)
        setDialogues([])
    }, [])

    return (
        <main className="space-y-16">
            <motion.div
                variants={SECTION_VARIANTS}
                initial="initial"
                animate="animate"
                className="text-center space-y-4"
            >
                <h1 className="font-serif text-5xl font-semibold tracking-wide">
                    GalSkill
                </h1>
                <p className="text-sm italic opacity-60">
                    角色 Skill 蒸馏工具 · 将角色数据转化为 Skill
                </p>
            </motion.div>

            <ModelConfig onConfigChange={handleApiConfigChange} />
            <SearchBox onCharacterSelect={handleCharacterSelect} />

            <AnimatePresence mode="wait">
                {selectedCharacter && (
                    <motion.section
                        key={selectedCharacter.id}
                        variants={SECTION_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-8"
                    >

                        <CharacterDetail
                            character={selectedCharacter}
                            onClose={handleDetailClosed}
                        />

                        <DialogueInput
                            character={selectedCharacter}
                            onDialoguesChange={handleDialoguesChange} />

                        <DistillProgress
                            character={selectedCharacter}
                            rawText={rawText}
                            dialogues={dialogues}
                            apiConfig={apiConfig}
                            onSkillGenerated={handleSkillGenerated}
                        />

                        <SkillExport
                            skill={generatedSkill}
                            character={selectedCharacter}
                            onSkillChange={handleSkillChange}
                        />
                    </motion.section>
                )}
            </AnimatePresence>

            <motion.footer
                variants={SECTION_VARIANTS}
                initial="initial"
                animate="animate"
                className="text-center pt-32 space-y-4"
            >
                <p className="text-xs opacity-40 italic">
                    GalSkill · 译作心之痕迹
                </p>
                <p className="text-xs opacity-30 text-accent dark:text-accent-dark">
                    数据来源:&nbsp;&nbsp;
                    <a href={"https://bgm.tv/"} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {"Bangumi"}
                    </a> ·
                    <a href={"https://vndb.org/"} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {"VNDB"}
                    </a> ·
                    <a href={"https://wikipedia.org/wiki/"} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {"维基百科"}
                    </a>
                </p>
            </motion.footer>
        </main>
    )
}
