'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CharacterData } from '@/lib/db'
import { getCharacterNames } from '@/lib/llmClient'
import { SECTION_VARIANTS, STAGGER_CHILD_VARIANTS, EXPAND_VARIANTS } from '@/lib/animations'

interface CharacterDetailProps {
    character: CharacterData
    onClose: () => void
}

export default function CharacterDetail({ character, onClose }: CharacterDetailProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const names = getCharacterNames(character)
    const primaryName = names[0] || '未知角色'
    const otherNames = names.slice(1, 4).join(' / ')

    const displaySubjects = isExpanded
        ? (character.subjects || [])
        : (character.subjects || []).slice(0, 5)

    return (
        <motion.div
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
        >
            <div className="flex items-start justify-between">
                <motion.div variants={STAGGER_CHILD_VARIANTS}>
                    <h2 className="font-serif text-2xl font-semibold">{primaryName}</h2>
                    {otherNames && (
                        <p className="text-sm opacity-70 italic py-2">{otherNames}</p>
                    )}
                </motion.div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-200"
                    aria-label="关闭详情"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                </button>
            </div>

            {character.summary && (
                <motion.section
                    variants={STAGGER_CHILD_VARIANTS}
                    className="space-y-2"
                >
                    <h3 className="gs-section-title border-b border-gray-300/60 dark:border-gray-700/60 pb-2">
                        角色简介
                    </h3>
                    <p className="text-[16px] leading-relaxed text-black-700/90 dark:text-gray-300/90 whitespace-pre-wrap font-serif pt-2 pb-2">
                        {character.summary}
                    </p>
                </motion.section>
            )}

            <motion.div
                variants={STAGGER_CHILD_VARIANTS}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2"
            >
                <section className="space-y-4">
                    <h3 className="gs-section-title border-b border-gray-300/60 dark:border-gray-700/60 pb-2">
                        基本信息
                    </h3>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm font-serif group">
                        <InfoItem label="性别" value={character.gender} />
                        <InfoItem label="生日" value={character.info?.birthday} />
                        <InfoItem label="年龄" value={character.info?.age} />
                        <InfoItem label="血型" value={character.info?.bloodt} />
                        <InfoItem label="身高" value={character.info?.height ? `${character.info.height}` : undefined} />
                        <InfoItem label="体重" value={character.info?.weight ? `${character.info.weight}` : undefined} />
                        <InfoItem label="Cup" value={character.info?.cup ? `${character.info.cup}` : undefined} />
                        <InfoItem label="BWH" value={character.info?.bwh && character.info?.bwh !== "///" ? `${character.info.bwh}` : undefined} />
                    </dl>
                </section>

                <section className="space-y-4">
                    <h3 className="gs-section-title border-b border-gray-300/60 dark:border-gray-700/60 pb-2">
                        出演作品
                    </h3>
                    <ul className="space-y-4">
                        <AnimatePresence initial={false}>
                            {displaySubjects.map((subject, idx) => (
                                <motion.li
                                    key={idx}
                                    variants={EXPAND_VARIANTS}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="ml-2 text-sm overflow-hidden group"
                                >
                                    <span className="font-serif group-hover:text-accent-light transition-colors duration-300">{subject.zh_name || subject.name}</span>
                                    <span className="ml-2 text-xs opacity-30 italic tracking-tighter">
                                        {getRoleTypeLabel(subject.role_type)}
                                    </span>
                                </motion.li>
                            ))}
                        </AnimatePresence>

                        {(character.subjects || []).length > 5 && (
                            <li>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-xs gs-link italic mt-1"
                                >
                                    {isExpanded ? '收起作品' : `展开全部 ${(character.subjects || []).length} 部作品`}
                                </button>
                            </li>
                        )}

                        {(!character.subjects || character.subjects.length === 0) && (
                            <li className="text-sm opacity-50 italic">暂无作品信息</li>
                        )}
                    </ul>
                </section>
            </motion.div>

            {character.info?.traits && Object.keys(character.info.traits).length > 0 && (
                <motion.section
                    variants={STAGGER_CHILD_VARIANTS}
                    className="space-y-4 pb-2"
                >
                    <h3 className="gs-section-title border-b border-gray-200 dark:border-gray-700 pb-2">
                        角色特征
                    </h3>
                    <div className="font-serif grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {Object.entries(character.info.traits).map(([category, values]) => (
                            <div key={category} className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 bg-accent-light dark:bg-accent-dark opacity-40" />
                                    <h4 className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        {category}
                                    </h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {values.map((trait, idx) => (
                                        <span key={idx} className="gs-tag-accent">
                                            {trait}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            <section className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-500 opacity-20" />
                    <span className="text-[12px] uppercase tracking-widest font-mono opacity-50">Reference</span>
                    <div className="h-px flex-1 bg-gray-500 opacity-20" />
                </div>
                <div className="flex justify-center gap-8 text-[12px] font-mono opacity-50">
                    <p>
                        <span>BGM: </span>
                        <ExternalLink href={`https://bgm.tv/character/${character.id}`} text={character.id} />
                    </p>
                    {character.info?.vndb_id && (
                        <p>
                            <span>VNDB: </span>
                            <ExternalLink href={`https://vndb.org/${character.info.vndb_id}`} text={character.info.vndb_id} />
                        </p>
                    )}
                </div>
            </section>
        </motion.div>
    )
}

function InfoItem({ label, value }: { label: string; value?: string | number }) {
    if (!value) return null
    return (
        <>
            <dt className="ml-2">{label}</dt>
            <dd className="opacity-70">{value}</dd>
        </>
    )
}

function ExternalLink({ href, text }: { href: string; text: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-light dark:text-accent-dark hover:underline"
        >
            {text}
        </a>
    )
}

function getRoleTypeLabel(roleType?: number): string {
    switch (roleType) {
        case 1: return '主角'
        case 2: return '配角'
        case 3: return '客串'
        default: return '未知'
    }
}
