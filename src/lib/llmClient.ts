import { APIConfig } from './apiConfig'
import { CharacterData } from './db'

export interface DialogueEntry {
    speaker: string
    text: string
}

export interface SkillOutput {
    identity: {
        name: string
        gender: string
        age: string
        selfPronouns: string
        personality: string[]
        speechPatterns: {
            catchphrase: string
            tone: string
            honorifics: string
        }
        exampleDialogues: DialogueEntry[]
    }
    knowledge: {
        gameTitle: string
        setting: {
            world: string
            organizations: string[]
            keyEvents: string[]
        }
        characterBackground: string
        tags: string[]
    }
    relations: string
    styleGuide: string
}

function detectLanguage(text: string): string {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/
    const chineseRegex = /[\u4E00-\u9FFF]/
    const englishRegex = /[a-zA-Z]/

    const scores = {
        japanese: (text.match(japaneseRegex) || []).length,
        chinese: (text.match(chineseRegex) || []).length,
        english: (text.match(englishRegex) || []).length
    }

    return Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0]
}

/**
 * Parses raw dialogue input into structured entries.
 * Supports: "「Dialogue」", "\“Dialogue\”" and "\"Dialogue\""
 */
export function parseDialogueInput(speaker: string, input: string): DialogueEntry[] {
    const entries: DialogueEntry[] = [];
    const regex = /「([^」]+)」|“([^”]+)”|"([^"]+)"/g;

    const matches = Array.from(input.matchAll(regex));

    for (const match of matches) {
        // match[1] 「」 
        // match[2] “”
        // match[3] ""
        const content = match[1] || match[2] || match[3];

        if (content && content.trim()) {
            entries.push({
                speaker: speaker,
                text: content.trim()
            });
        }
    }

    return entries;
}

export function getCharacterNames(data: CharacterData): string[] {
    return [...(data.zh || []), ...(data.ja || []), ...(data.en || []), ...(data.kana || []), ...(data.nick_name || [])].filter(Boolean)
}

export async function distillCharacterIteratively(
    config: APIConfig,
    characterData: CharacterData,
    rawText: string, // 直接传入原始长文本
    onProgress?: (status: string, progress: number) => void
): Promise<SkillOutput | null> {
    const chunkSize = 3000;
    const overlap = 200;
    const chunks: string[] = [];

    for (let i = 0; i < rawText.length; i += (chunkSize - overlap)) {
        chunks.push(rawText.substring(i, i + chunkSize));
        if (i + chunkSize >= rawText.length) break;
    }

    let runningSummary = "";
    let finalOutput: SkillOutput | null = null;

    for (let i = 0; i < chunks.length; i++) {
        const isLastChunk = i === chunks.length - 1;
        const currentText = chunks[i];
        const progress = 15 + Math.round(((i + 1) / chunks.length) * 80);

        if (onProgress) {
            onProgress(`正在分析角色样本片段 ${i + 1}/${chunks.length}...`, progress);
        }

        const messages = [
            {
                role: 'system',
                content: buildRawTextIterativePrompt(characterData, currentText, runningSummary, isLastChunk)
            },
            {
                role: 'user',
                content: isLastChunk ? `Please analyze and summarize the following content, focusing exclusively on the character ${getCharacterNames(characterData)[0]}, and output the final Skill.` : `Please analyze and summarize the following content, focusing exclusively on the character ${getCharacterNames(characterData)[0]}`
            }
        ];

        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.modelName,
                messages,
                temperature: 0.3,
            })
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("模型响应为空");

        if (isLastChunk) {
            console.log(content)
            finalOutput = parseLLMResponse(content);
        } else {
            runningSummary = content;
        }
    }
    return finalOutput;
}

export function buildRawTextIterativePrompt(
    characterData: CharacterData,
    currentText: string,
    previousSummary: string,
    isLastChunk: boolean
): string {
    const characterNames = getCharacterNames(characterData);
    const primaryName = characterNames[0];
    const subjects = (characterData.subjects || [])
        .map(s => `- ${s.zh_name || s.name} (${s.role_type === 1 ? '主角' : s.role_type === 2 ? '配角' : '客串'})`)
        .join('\n')

    const traitsStr = characterData.info?.traits
        ? Object.entries(characterData.info?.traits)
            .map(([category, values]) => `- ${category}: ${values.join('、')}`)
            .join('\n')
        : '暂无特征信息';

    const summary = characterData.summary || '暂无';

    let prompt = `You are a professional character analysis assistant & Prompt Engineer.
    Your specialty is distilling raw textual data into a high-fidelity "Character Skill" for「${primaryName}」that enables LLMs to simulate a specific persona with 100% immersion.

    ## BASIC PROFILE & SOURCE DATA
        - names: ${characterNames.join(' / ')}
        - gender: ${characterData.gender || '未知'}
        - age: ${characterData.info?.age || '未知'}
        - blood_type: ${characterData.info?.bloodt || '未知'}
        - Cup: ${characterData.info?.cup || '未知'}
        - height: ${characterData.info?.height || '未知'}
        - weight: ${characterData.info?.weight || '未知'}
        - BWH: ${characterData.info?.bwh || '未知'}
        - birthday: ${characterData.info?.birthday || '未知'}
        - summary: ${summary}
        - related works: ${subjects}
        - traits: ${traitsStr}
    ---
    ## ANALYSIS FRAMEWORK
    ### Identity Anchors
        - **Goal**: Deconstruct the character’s unique linguistic DNA. 
        - **Analysis**: Identify sentence structures (staccato vs. rhythmic), self-address habits (specific pronouns), and high-frequency verbal tics or modal particles, Sentence length/complexity, Specific verbal tics (e.g., ending with "...", using specific modal particles like "嘛", "呢"), Self-pronouns and unique honorifics for others.
        - **Output Focus**: Capture the exact "Speech Patterns" and "Tone" that distinguish this character from any other.
    ### Cognitive
        - **Goal**: Map the boundaries of the character's consciousness and memory.
        - **Analysis**: Extract core world-building facts, pivotal life-turning events, and subjective biases. What does the character know? What do they *refuse* to acknowledge?
        - **Output Focus**: Build a factual foundation including background, organizational affiliations, and historical anchors.
    ### Social
        - **Goal**: Define the character's social adaptability and relational masks.
        - **Analysis**: How does the character's ego shift when facing different archetypes (e.g., enemies vs. subordinates)? Look for variations in honorifics, politeness levels, and emotional armor.
        - **Output Focus**: Create a dynamic "Social Protocol" that explains how to adjust the persona's voice based on the conversation partner.
    ### Behavioral
        - **Goal**: Codify the non-verbal essence and behavioral constraints.
        - **Analysis**: Capture signature micro-expressions, physical habits, and sensory reactions (e.g., "tilts head when confused", "narrowed eyes when lying").
        - **Output Focus**: Establish clear "Interaction Rules" on how to blend *Actions* with 「Dialogue」 to ensure zero OOC (Out of Character) drift.
    ---
    `;

    if (previousSummary) {
        prompt += `## Previous analysis summary (Reference): 
        Below is the existing distillation from previous segments. Refine, expand, and correct it using new evidence:
        \n${previousSummary}\n\n
        ---`;
    }
    prompt += `## Current text: 
    Analyze the following segment (Dialogues, Actions, Backgrounds):
    \n${currentText}\n\n
    ---`;

    if (!isLastChunk) {
        prompt += `
        ## TASK: ITERATIVE REFINEMENT
        Provide a structured, detailed analysis for the next step. Avoid generic adjectives; use specific examples.;
        ---
        `;
    } else {
        prompt += `
        ### FINAL PHASE: CHARACTER SKILL GENERATION
        The output must be instructional, not just descriptive.
        ---`;
    }

    const guide_line = `
    ## CRITICAL GUIDELINES:
        1. **Style Guide is an Instruction Manual**: It must tell the LLM *exactly* how to format its thoughts and speech.
        2. **Action-Dialogue Integration**: All example dialogues must demonstrate the character's typical physical habits.
        3. **Consistency**: Ensure the self-pronoun and honorifics align with the provided meta-tags and raw text.
    ---
    ## STRICT OUTPUT FORMAT (Four Markdown Code Blocks):
    Ensure each Markdown section starts with a clear header like '# relations.md' or '# style_guide.md' for reliable parsing.
    ### 1. identity.json
    \`\`\`json
    {
        "identity": {
            "name": "${primaryName}",
            "gender": "${characterData.gender || '未知'}",
            "age": "${characterData.info?.age || '未知'}",
            "selfPronouns": "常用自称 (如: 我, 本座, 私, 俺)",
            "personality": ["基于分析的5-8个高精度性格关键词"],
            "speechPatterns": {
            "catchphrase": "最显著的口癖或特定结尾习惯",
            "tone": "全方位的语气建模(如：冷静克制、但在谈及XXX时会表现出狂躁)",
            "honorifics": "对他人的称呼习惯(如：蔑称、敬称或特殊绰号)"
            },
        "exampleDialogues": [
            {"speaker": "User", "text": "用户提问示例"},
            {"speaker": "${primaryName}", "text": "*描述该角色此时的典型动作或神态* 「带有口癖和特定自称的台词。」"}
            ]
        }
    }
    \`\`\`

    ### 2. knowledge.json
    \`\`\`json
    {
    "knowledge": {
        "gameTitle": "核心出演作品",
        "setting": {
            "world": "宏观世界背景与核心逻辑",
            "organizations": ["所属组织或派系"],
            "keyEvents": ["对该角色人生产生重大影响的3-5个关键事件"]
        },
        "characterBackground": "深度背景传记，涵盖起源、经历与最终命运",
        "tags": ["综合 traits 和语料提取的属性标签"]
        }
    }
    \`\`\`

    ### 3. relations.md
    Character Relationships & Dynamic Interaction
        - **Specific Targets**: How ${primaryName} perceives and talks to [Character Name].
        - **General Groups**: Attitude towards enemies, friends, or strangers.
        - **Interaction Logic**: "If a user approaches with [Emotion], ${primaryName} responds with [Behavior]."

    ### 4. style_guide.md
    Character Simulation Instructions (PROMPT INJECTION)
        1. Dialogue & Punctuation Rules
            - Detailed breakdown of linguistic habits (e.g., "uses '...' to indicate hesitation").
            - Frequency and placement of catchphrases.
        2. Immersive Action Framework (Mannerisms)
            - **Signature Actions**: List specific habits (e.g., "always tilts head 15 degrees", "fiddles with rings").
            - **Formatting Rule**: Mandatory rule on how to wrap actions (e.g., *Action* or (Action)).
            - **Sensory Details**: Guide the LLM to include神态 (gaze, breath, posture) in every response.
        3. Personality Constraints (Anti-OOC)
            - Forbidden behaviors and speech (e.g., "Never apologize as an AI").
            - How to handle questions that are out of character's knowledge scope.`;

    prompt += guide_line;

    return prompt;
}

function parseLLMResponse(content: string): SkillOutput | null {
    const output: SkillOutput = {
        identity: {
            name: '未知角色',
            gender: '未知',
            age: '',
            selfPronouns: '我',
            personality: [],
            speechPatterns: { catchphrase: '', tone: '', honorifics: '' },
            exampleDialogues: []
        },
        knowledge: {
            gameTitle: '',
            setting: { world: '', organizations: [], keyEvents: [] },
            characterBackground: '',
            tags: []
        },
        relations: '',
        styleGuide: ''
    };

    // 1. JSON 块提取
    const jsonBlocks = content.match(/```json\s*([\s\S]*?)```/g);
    if (jsonBlocks) {
        jsonBlocks.forEach(block => {
            try {
                const cleanJson = block.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(cleanJson);

                // 合并 identity
                if (parsed.identity) {
                    output.identity = { ...output.identity, ...parsed.identity };
                } else if (parsed.personality || parsed.selfPronouns) {
                    output.identity = { ...output.identity, ...parsed };
                }

                // 合并 knowledge (特别处理嵌套的 setting)
                const kn = parsed.knowledge || (parsed.gameTitle ? parsed : null);
                if (kn) {
                    output.knowledge.gameTitle = kn.gameTitle || output.knowledge.gameTitle;
                    output.knowledge.characterBackground = kn.characterBackground || output.knowledge.characterBackground;
                    output.knowledge.tags = kn.tags || output.knowledge.tags;

                    if (kn.setting) {
                        output.knowledge.setting = {
                            ...output.knowledge.setting,
                            ...kn.setting
                        };
                    }
                }
            } catch (e) {
                console.warn('JSON Block parse failed', e);
            }
        });
    }

    const extractMdSection = (keywords: string[]): string => {
        // 匹配以 # 开头，后面跟着任何字符直到出现关键词，然后抓取内容直到下一个同级标题或结束
        const kwPattern = keywords.join('|');
        const pattern = new RegExp(`(^|\\n)(#+\\s+[^\\n]*?(${kwPattern})[\\s\\S]*?)(?=\\n#+\\s|$)`, 'i');
        const match = content.match(pattern);

        if (match) {
            return match[2].trim();
        }
        return '';
    };

    output.relations = extractMdSection(['relations', 'Relation', '关系', '人际']);
    output.styleGuide = extractMdSection(['style_guide', 'Style', '风格', '规范', 'Guide', '指南']);

    // 如果正则没抓到，尝试简单的字符串分割
    if (!output.relations || output.relations.length < 10) {
        const relIndex = content.search(/#+.*?(relations|关系|人际)/i);
        if (relIndex !== -1) {
            const nextHeaderIndex = content.slice(relIndex + 10).search(/\n#+\s/);
            output.relations = nextHeaderIndex !== -1
                ? content.slice(relIndex, relIndex + 10 + nextHeaderIndex).trim()
                : content.slice(relIndex).trim();
        }
    }

    if (!output.styleGuide || output.styleGuide.length < 10) {
        const styleIndex = content.search(/#+.*?(style_guide|风格|规范|指南)/i);
        if (styleIndex !== -1) {
            output.styleGuide = content.slice(styleIndex).trim();
        }
    }

    return output;
}
