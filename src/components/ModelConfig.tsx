'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { APIConfig, ApiConfigManager } from '@/lib/apiConfig'
import { SECTION_VARIANTS } from '@/lib/animations'

interface ModelConfigProps {
    onConfigChange: (config: APIConfig) => void
}

export default function ModelConfig({ onConfigChange }: ModelConfigProps) {
    const [config, setConfig] = useState<APIConfig>({
        baseUrl: '',
        modelName: '',
        apiKey: ''
    })
    const [showApiKey, setShowApiKey] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const savedConfig = ApiConfigManager.load()
        setConfig(savedConfig)
        onConfigChange(savedConfig)
    }, [onConfigChange])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        const next = { ...config, [name]: value }
        setConfig(next)
        setError(null)
        onConfigChange(next)
    }, [config, onConfigChange])

    const handleBlur = useCallback(() => {
        const validation = ApiConfigManager.validate(config)
        if (!validation.valid) {
            setError(validation.error || '配置无效')
        } else {
            setError(null)
            ApiConfigManager.save(config)
            onConfigChange(config)
        }
    }, [config, onConfigChange])

    return (
        <motion.section
            variants={SECTION_VARIANTS}
            initial="initial"
            animate="animate"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs mb-1.5 text-olive">
                        Base URL
                    </label>
                    <input
                        type="url"
                        name="baseUrl"
                        value={config.baseUrl}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="https://api.deepseek.com"
                        className="gs-input"
                    />
                </div>

                <div>
                    <label className="block text-xs mb-1.5 text-olive">
                        模型名称
                    </label>
                    <input
                        type="text"
                        name="modelName"
                        value={config.modelName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="deepseek-v4-flash"
                        className="gs-input"
                    />
                </div>

                <div>
                    <label className="block text-xs mb-1.5 text-olive">
                        API Key
                    </label>
                    <div className="relative">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            name="apiKey"
                            value={config.apiKey}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="sk-..."
                            className="gs-input pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                            aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                            aria-pressed={showApiKey}
                        >
                            {showApiKey ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <p className="mt-2 text-xs text-stone">
                API Key 仅存储在本地浏览器中，不会上传至任何服务器
            </p>

            {error && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-500 mt-2"
                >
                    {error}
                </motion.p>
            )}
        </motion.section>
    )
}