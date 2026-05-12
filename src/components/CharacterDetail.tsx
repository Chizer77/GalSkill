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
        <motion.section
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-8"
        >
            <h2 className="section-title">角色详情</h2>
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="font-serif text-2xl text-near-black">{primaryName}</h3>
                    {otherNames && (
                        <p className="text-sm mt-1 font-serif text-olive">{otherNames}</p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                    aria-label="关闭详情"
                >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                    </svg>
                </button>
            </div>

            {character.summary && (
                <motion.section variants={STAGGER_CHILD_VARIANTS} className="space-y-3">
                    <h4 className="sub-title">角色简介</h4>
                    <p className="text-base leading-relaxed font-serif whitespace-pre-wrap text-dark-warm">
                        {character.summary}
                    </p>
                </motion.section>
            )}

            <motion.section
                variants={STAGGER_CHILD_VARIANTS}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
                <div className="space-y-3">
                    <h4 className="sub-title">基本信息</h4>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm font-serif">
                        <InfoItem label="性别" value={character.gender} />
                        <InfoItem label="生日" value={character.info?.birthday} />
                        <InfoItem label="年龄" value={character.info?.age} />
                        <InfoItem label="血型" value={character.info?.bloodt} />
                        <InfoItem label="身高" value={character.info?.height ? `${character.info.height}` : undefined} />
                        <InfoItem label="体重" value={character.info?.weight ? `${character.info.weight}` : undefined} />
                        <InfoItem label="Cup" value={character.info?.cup ? `${character.info.cup}` : undefined} />
                        <InfoItem label="BWH" value={character.info?.bwh && character.info?.bwh !== "///" ? `${character.info.bwh}` : undefined} />
                    </dl>
                </div>

                <div className="space-y-3">
                    <h4 className="sub-title">出演作品</h4>
                    <ul className="space-y-3">
                        <AnimatePresence initial={false}>
                            {displaySubjects.map((subject, idx) => (
                                <motion.li
                                    key={idx}
                                    variants={EXPAND_VARIANTS}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    className="text-sm font-serif text-stone"
                                >
                                    {subject.zh_name || subject.name}
                                    <span className="ml-2 text-xs text-stone">
                                        {getRoleTypeLabel(subject.role_type)}
                                    </span>
                                </motion.li>
                            ))}
                        </AnimatePresence>

                        {(character.subjects || []).length > 5 && (
                            <li>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="gs-link text-xs italic"
                                >
                                    {isExpanded
                                        ? '收起作品'
                                        : `展开全部 ${(character.subjects || []).length} 部作品`}
                                </button>
                            </li>
                        )}

                        {(!character.subjects || character.subjects.length === 0) && (
                            <li className="text-sm font-serif text-stone">暂无作品信息</li>
                        )}
                    </ul>
                </div>
            </motion.section>

            {character.info?.traits && Object.keys(character.info.traits).length > 0 && (
                <motion.section variants={STAGGER_CHILD_VARIANTS} className="space-y-4">
                    <h4 className="sub-title">角色特征</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                        {Object.entries(character.info.traits).map(([category, values]) => (
                            <div key={category} className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-3 rounded-full bg-brand-light" />
                                    <h5 className="text-xs font-serif font-semibold uppercase tracking-wider text-dark-warm">
                                        {category}
                                    </h5>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {values.map((trait, idx) => (
                                        <span key={idx} className="gs-tag">{trait}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            <footer className="space-y-3 pt-4">
                <hr className="divider" />
                <div className="flex justify-center gap-8 text-xs font-mono text-stone">
                    <p>
                        BGM:{' '}
                        <a
                            href={`https://bgm.tv/character/${character.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gs-link"
                        >
                            {character.id}
                        </a>
                    </p>
                    {character.info?.vndb_id && (
                        <p>
                            VNDB:{' '}
                            <a
                                href={`https://vndb.org/${character.info.vndb_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gs-link"
                            >
                                {character.info.vndb_id}
                            </a>
                        </p>
                    )}
                </div>
            </footer>
        </motion.section>
    )
}

function InfoItem({ label, value }: { label: string; value?: string | number }) {
    if (!value) return null
    return (
        <>
            <dt className="text-stone">{label}</dt>
            <dd className="text-dark-warm">{value}</dd>
        </>
    )
}

const ROLE_TYPE_LABELS: Record<number, string> = {
    1: '主角',
    2: '配角',
    3: '客串',
}

function getRoleTypeLabel(roleType?: number): string {
    return roleType ? ROLE_TYPE_LABELS[roleType] ?? '未知' : '未知'
}
