# SPDX-License-Identifier: GPL-3.0-or-later
#
# Original work Copyright (c) 2024 沉默の金
# Modified work Copyright (c) 2026 Chizer
from __future__ import annotations

import json
import logging
import re
import gc
import opencc
from janome.tokenizer import Token, Tokenizer
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="[%(levelname)s]%(asctime)s(%(lineno)d):%(message)s")
s2t_converter = opencc.OpenCC("s2t.json")
t2s_converter = opencc.OpenCC("t2s.json")
tokenizer = Tokenizer()

known_ja_names = ["亜門", "死神様", "宇白順", "九鳳院紫"]
maybe_ja_names = []

def clear(content: str) -> str:
    content = content.replace("\t", "").replace("\n", "").replace("\r", "").replace("‎", "").replace("\u3000", "")
    content = re.sub(r"^ +| +$", "", content)
    return re.sub(r"[（(\[【［][^)）】\]］]*[】］\])）]", "", content)


def get_jawiki_char_names(char_name: str) -> list[str]:
    result = []
    spilt_brackets = re.findall(r"\((.*?)\)", char_name) + re.findall(r"（(.*?)）", char_name)
    no_brackets_names = re.split(r"\(.*?\)|（.*?）", char_name)
    for bracket in spilt_brackets:
        if re.findall(r"通称|版|,|-|\d\d\d\d|#", bracket): continue
        result.append(bracket)
    for name in no_brackets_names:
        if "#" in name: continue
        ja_en = re.findall(r"([\u3040-\u309F\u30A0-\u30FF・])+\s+([a-zA-Z ]+)", name.strip())
        if ja_en:
            for item in ja_en: result.extend(item)
        result.append(name)
    return list(set(result))


def is_english_with_symbols(text: str) -> bool:
    # 使用正则表达式匹配英文字母、数字、空格和常见符号
    return bool(re.match(r'^[a-zA-Z0-9\s\.,!@#\$%\^&\*\(\)-_=\+;:\'"\[\]\{\}<>\?/\\|`~·↓]*$', text))


def is_japanese(text: str) -> bool:
    # 使用正则表达式匹配日文字符范围
    return bool(re.search(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]", text))


def include_japanese(text: str) -> bool:
    return bool(re.search(r"[\u3040-\u309F\u30A0-\u30FF]", text))


def subject_name_compare(name1: str, name2: str) -> bool:
    def normalize(n: str):
        return clear(n.replace(" ", "").replace("*", "＊").replace("「", "").replace("」", ""))   # 千恋＊万花  # noqa: RUF003
    n1, n2 = normalize(name1), normalize(name2)
    if n1 == n2: return True
    return len(n1) > 4 and len(n2) > 4 and n1[:4] == n2[:4]


def is_jp_name(text: str, jp_surnames: list[str]) -> bool:
    if is_english_with_symbols(text):
        return False
    if include_japanese(text):
        return True
    if is_japanese(text) and s2t_converter.convert(text) == text and len(text) > 3:
        return True
    if text in known_ja_names:
        return True
    return any(text.startswith(jp_surname) for jp_surname in jp_surnames)


def is_zh_name(text: str) -> bool:
    text = text.strip()
    if " " in text:
        return False
    if not re.fullmatch(r"[\u4E00-\u9FFF）（)(]+", text):
        return False
    if t2s_converter.convert(text) != text:
        return False
    return True


def is_from_zh_subject(subjects: list[dict], o_subjects_dict: dict[str, dict]) -> bool:
    subject_ids = [subject["subject_id"] for subject in subjects]
    for subject_id in subject_ids:
        subject = o_subjects_dict.get(subject_id)
        if subject is None:
            continue
        tags = [t["name"] for t in subject.get("tags", [])]
        for tag in tags:
            if tag in [
                "国产",
                "中国",
                "中国动画",
                "国产动画",
                "国产游戏",
                "中国大陆",
                "国产Galgame",
            ]:
                return True
    return False


def is_from_ja_subject(subjects: list[dict], o_subjects_dict: dict[str, dict]) -> bool:
    subject_ids = [subject["subject_id"] for subject in subjects]
    for subject_id in subject_ids:
        subject = o_subjects_dict.get(subject_id)
        if subject is None:
            continue
        if include_japanese(subject["name"]):
            return True
        tags = [t["name"] for t in subject.get("tags", [])]
        for tag in tags:
            if tag in ["日本", "日本动画", "日本漫画", "日系"]:
                return True
    return False


def get_jawiki_text(names, subjects, jawiki, jawiki_mapping):
    result, w_names = [], []
    for name in names:
        for w_id, w_char_name in jawiki_mapping.get(name, []):
            w_titles = jawiki[w_id]["titles"]
            for s in subjects:
                if any(subject_name_compare(wt, s["name"]) for wt in w_titles):
                    w_names += get_jawiki_char_names(w_char_name)
                    result.append(jawiki[w_id]["char"][w_char_name].strip())
    return list(set(result)), list(set(w_names))

# --- 全局预编译正则与映射 ---
ZH_NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", 
          "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"]
ZH_NUM_RE = rf"(?:{'|'.join(ZH_NUM)})"

# 预编译中文匹配规则 {Pattern: 是否需要保留前缀}
ZH_RULES = {
    re.compile(r"(?:男|女)?主角"): False,
    re.compile(r"(?:男|女)?主人公"): False,
    re.compile(r"主要人物"): False,
    re.compile(r"妹妹|姊姊|姊夫|姐姐|哥哥|爷爷|奶奶|外公|外婆|丈夫|妻子|团长|混血儿|师弟|师妹|搭档|少年|伙伴|小姐|千金|随侍|隨從|专家|超能力者|刑警|制作人|当家|助手|女仆|故友|飞行员|科学家|研究员|首领"): True,
    re.compile(r"(?:亲生)?父?亲"): True,
    re.compile(r"(?:亲生)?母?亲"): True,
    re.compile(r"外?祖父"): True,
    re.compile(r"外?祖母"): True,
    re.compile(r"前?恋人"): True,
    re.compile(r"前?(?:男|女)朋友"): True,
    re.compile(r"前(?:夫|妻)"): True,
    re.compile(r"(?:大|小)?儿子"): True,
    re.compile(r"(?:大|小)?女儿"): True,
    re.compile(r"独生(?:女|子)"): True,
    re.compile(r"骑士"): False,
    re.compile(r"(?:转|留|男|女|.年级)?学生"): False,
    re.compile(r"(?:大学|高中|初中|小学)生"): False,
    re.compile(r"(?:后|前)辈"): True,
    re.compile(r"店小二"): False,
    re.compile(r"美?少女"): False,
    re.compile(r"从者"): True,
    re.compile(r"拥有者"): True,
    re.compile(r"同班同学"): True,
    re.compile(r"(?:男|女)?医生"): False,
    re.compile(r"(?:男|女)?警察"): False,
    re.compile(r"(?:男|女)?老师"): False,
    re.compile(r"(?:天才)?黑客"): False,
    re.compile(rf"第?{ZH_NUM_RE}公主"): False,
}

# 日文标签映射 {原文: (中文翻译, 是否需要加“的”)}
JA_RULES = {
    '目的のために使役される者': ('被利用者', True), '姦計を企てる者': ('阴谋家', False),
    '最後の生き残り': ('最后幸存者', False), '組織のリーダー': ('组织领导者', False),
    '仲直りした人物': ('和解者', False), '罠に落ちた人物': ('陷阱受害者', False),
    '腹違いの妹': ('同父异母的妹妹', True), '腹違いの姉': ('同父异母的姐姐', True),
    '腹違いの長兄': ('同父异母的长兄', True), '腹違いの兄': ('同父异母的兄弟', True),
    '腹違いの弟': ('同父异母的弟弟', True), 'バイオロイド': ('生化人', False),
    '忘れられた者': ('被遗忘者', False), 'アンドロイド': ('人造人', False),
    '遭遇する人物': ('遭遇者', False), '謎めいた人物': ('神秘人物', False),
    '騙された人物': ('被欺骗者', False), '守るべき存在': ('值得守护者', False),
    '悪行の犠牲者': ('罪恶受害者', False), '虐待の被害者': ('虐待受害者', False),
    '苦悩する人物': ('苦恼者', False), '実験の被験者': ('实验对象', False),
    '封印されし者': ('被封印者', False), '翻弄される者': ('被玩弄者', False),
    '謎めいた存在': ('神秘存在', False), '義理の兄弟': ('继兄弟', True),
    '義理の姉妹': ('继姐妹', True), '義理の儿子': ('继子', True),
    '義理の祖父': ('继祖父', True), '義理の祖母': ('继祖母', True),
    '義理の叔父': ('继叔父', True), '義理の叔母': ('继叔母', True),
    '対立する者': ('对立者', False), '伪りの仲間': ('虚假同伴', True),
    '英雄の師匠': ('英雄导师', False), '学问の師匠': ('学问导师', False),
    '闇の支配者': ('暗黑支配者', False), '悲劇の人物': ('悲剧人物', False),
    '苦しむ人物': ('受苦者', False), '使役する者': ('利用者', False),
    '後悔する者': ('后悔者', False), '谜めいた男': ('神秘男子', False),
    '谜めいた女': ('神秘女子', False), '魅了する者': ('魅惑者', False),
    '愛憎の対象': ('爱憎对象', False), '人生の指针': ('人生导师', True),
    '生徒会長': ('学生会长', False), '女性医師': ('女医生', False),
    '女子大生': ('女大学生', False), 'ロボット': ('机器人', False),
    '義理の父': ('继父', True), '義理の母': ('继母', True),
    '義理の娘': ('继女', True), '義理の孙': ('继孙子/继孙女', True),
    '義理の 姪': ('继侄女/继侄子', True), '担任教师': ('班主任', False),
    '競争相手': ('竞争对手', True), 'ライバル': ('对手', True),
    '裏切り者': ('叛徒', False), '结婚相手': ('配偶', False),
    '不伦相手': ('外遇对象', False), '影の存在': ('影子', False),
    '秘密组织': ('秘密组织', False), '裏の黒幕': ('幕后黑手', False),
    '人造人間': ('人造人', False), '心理学者': ('心理学家', False),
    '人間兵器': ('人类武器', False), '取り巻き': ('随从', False),
    '消えた者': ('消失者', False), '愛する者': ('爱人', True),
    '教える者': ('教导者', False), '主人公': ('主人公', False),
    '転入生': ('转学生', False), '老医師': ('老医生', False),
    '指挥官': ('指挥官', True), '警备员': ('警备员', True),
    '保安官': ('警长', True), '曾祖父': ('曾祖父', True),
    '従姉妹': ('堂姐妹', True), '従兄弟': ('堂兄弟', True),
    '幼馴染': ('青梅竹马', True), '同級生': ('同学', True),
    '従事员': ('员工', False), '搜査员': ('调查员', True),
    '配偶者': ('配偶', True), '嫌疑者': ('嫌疑人', False),
    '被告人': ('被告人', False), '守护者': ('守护者', False),
    '犯罪者': ('罪犯', False), '逃亡者': ('逃亡者', False),
    '裁判官': ('审判官', False), '追迹者': ('追踪者', False),
    '谜の男': ('神秘男子', False), '谜の女': ('神秘女子', False),
    '実験体': ('实验体', False), '生存者': ('幸存者', False),
    'スパイ': ('间谍', False), '谍报员': ('情报员', False),
    '内通者': ('内鬼', False), '依頼人': ('委托人', False),
    '復讐者': ('复仇者', False), '治癒者': ('治愈者', False),
    '堕落者': ('堕落者', False), '暗殺者': ('刺客', False),
    '尋问者': ('审讯者', False), '負傷者': ('受伤者', False),
    '狂信者': ('狂热者', False), '誘惑者': ('诱惑者', False),
    '共闘者': ('共同作战者', False), '再生者': ('再生者', False),
    '破滅者': ('毁灭者', False), '求愛者': ('求爱者', False),
    '逃避者': ('逃避者', False), '見習い': ('学徒', False),
    '悩む者': ('苦恼者', False), '掠奪者': ('掠夺者', False),
    '支配者': ('支配者', False), '壊す者': ('破坏者', False),
    '母親': ('母亲', True), '祖父': ('祖父', True),
    '老人': ('老人', False), '漁師': ('渔夫', False),
    '盗賊': ('盗贼', False), '女性': ('女性', False),
    '医師': ('医生', False), '警察': ('警察', False),
    '恋人': ('恋人', True), '戦友': ('战友', True),
    '青年': ('青年', False), '友人': ('友人', True),
    '彼女': ('女友', True), '魔物': ('魔物', False),
    '魔王': ('魔王', False), '神々': ('神', False),
    '王子': ('王子', False), '祖母': ('祖母', True),
    '叔父': ('叔父', True), '儿子': ('儿子', True),
    '叔母': ('叔母', True), '伯母': ('伯母', True),
    '継父': ('继父', True), '義母': ('继母', True),
    '継母': ('继母', True), '生母': ('亲生母亲', True),
    '実母': ('亲生母亲', True), '養母': ('养母', True),
    '乳母': ('保姆', True), '従妹': ('堂姐妹', True),
    '養子': ('养子', True), '養女': ('养女', True),
    '先生': ('老师', False), '学生': ('学生', False),
    '上司': ('上司', True), '部下': ('部下', True),
    '同僚': ('同事', True), '友達': ('朋友', True),
    '恩師': ('恩师', True), '教师': ('老师', False),
    '恩人': ('恩人', True), '仲間': ('同伴', True),
    '武将': ('武将', False), '相棒': ('搭档', False),
    '少年': ('少年', False), '少女': ('少女', False),
    '家族': ('家人', True), '隣人': ('邻居', True),
    '仮面': ('面具', False), '忍者': ('忍者', False),
    '商人': ('商人', False), '王妃': ('王妃', False),
    '巫女': ('巫女', False), '司祭': ('祭司', False),
    '贤者': ('贤者', False), '使者': ('使者', False),
    '隊長': ('队长', False), '首相': ('首相', False),
    '皇子': ('皇子', False), '皇女': ('皇女', False),
    '手下': ('手下', False), '宿敵': ('宿敌', False),
    '刺客': ('刺客', False), '骑士': ('骑士', False),
    '女王': ('女王', False), '爱人': ('情人', True),
    '许婚': ('未婚夫/未婚妻', True), '仲人': ('媒人', False),
    '捕虜': ('俘虏', False), '悪党': ('恶棍', False),
    '悪魔': ('恶魔', False), '天使': ('天使', False),
    '妖精': ('精灵', False), '亡霊': ('幽灵', False),
    '英雄': ('英雄', False), '判事': ('法官', False),
    '探偵': ('侦探', False), '司法': ('司法', False),
    '証人': ('证人', False), '罪人': ('罪人', False),
    '報酬': ('报酬', False), '策士': ('谋士', False),
    '生贄': ('牺牲品', False), '親友': ('挚友', True),
    '父': ('父亲', True), '母': ('母亲', True),
    '妹': ('妹妹', True), '娘': ('女儿', False),
    '姉': ('姐姐', True), '姪': ('侄女/侄子', True),
    '兄': ('哥哥', True), '孙': ('孙子/孙女', True),
    '妻': ('妻子', True), '夫': ('丈夫', True),
    '妾': ('小妾', False), '帝': ('皇帝', False),
    '妃': ('妃子', False), '君': ('君主', False),
    '侍': ('侍', False), '姫': ('公主', False),
    '敌': ('敌人', False), '竜': ('龙', False),
}

# 辅助工具：提取 Janome Token 信息
def get_token_info(token: Token):
    return token.part_of_speech.split(','), token.surface

def analyze(names, subjects, summary, jawiki, jawiki_mapping):
    def p(summary: str) -> list:
        result = []
        summary = summary.strip()
        if not summary: return result
        
        is_ja = include_japanese(summary)
        # 仅按句号和换行切分，保留逗号语境
        summary_s = [s.strip() for s in re.split(r"[。]|\r\n", summary) if s.strip()]

        for index, s in enumerate(summary_s):
            if is_ja:
                # 1. 完整匹配
                cleaned_s = re.sub(r"本(?:編|作品?)の", "", s).strip()
                if cleaned_s in JA_RULES:
                    result.append(JA_RULES[cleaned_s][0])
                
                # 2. 分词语法匹配 (XX的YY)
                tokens = [get_token_info(tk) for tk in tokenizer.tokenize(s)]
                verb_found = False
                for i, token in enumerate(tokens):
                    if "動詞" in token[0]:
                        verb_found = True; break
                    
                    if token[1] == "の":
                        # 获取“の”之前的连续名词
                        before = ""
                        for t_ in tokens[:i][::-1]:
                            if t_[0][0] == "名詞": before = t_[1] + before
                            else: break
                        
                        if not before or before in ["腹違い"]: continue
                        
                        # 尝试匹配后面的 1-3 个 token 是否在词典中
                        after = ""
                        for t_ in tokens[i + 1:i + 4]:
                            after += t_[1]
                            if after in JA_RULES:
                                label, needs_prefix = JA_RULES[after]
                                result.append(f"{before}的{label}" if needs_prefix else label)
                if verb_found: continue
            else:
                # 排除动词/连接词
                if any(k in s for k in ["不是", "有", "去", "着", "与", "所以", "为了"]): continue
                
                # 1. 句首直接匹配 (如: “主角是...”)
                if index == 0:
                    for pattern, _ in ZH_RULES.items():
                        match = pattern.match(s)
                        if match: result.append(match.group())

                # 2. “的”字结构匹配
                if "的" in s:
                    parts = s.split("的")
                    header = parts[0].split("是")[-1] if "是" in parts[0] else parts[0]
                    to_match = parts[-1]
                    for pattern, needs_prefix in ZH_RULES.items():
                        match = pattern.match(to_match)
                        if match:
                            res_str = match.group()
                            result.append(f"{header}的{res_str}" if needs_prefix else res_str)
        return list(set(result))

    jawiki_texts, w_names = get_jawiki_text(names, subjects, jawiki, jawiki_mapping)
    all_tags = []
    for t in jawiki_texts: all_tags.extend(p(t))
    if summary: all_tags.extend(p(summary))
    return list(set(all_tags)), w_names


def load_static_mappings():

    logging.info("加载 jp_surnames.json...")
    with open("jp_surnames.json", encoding="utf-8") as f:
        jp_surnames = json.load(f)

    logging.info("加载 jawiki.json...")
    with open("jawiki.json", encoding="utf-8") as f:
        jawiki = json.load(f)
    
    jawiki_cname_info_mapping = {}
    for w_id, value in tqdm(jawiki.items(), desc="构建 Wiki 索引"):
        w_chars = value.get("char", {})
        for w_char_name in w_chars.keys():
            for name in get_jawiki_char_names(w_char_name):
                if name not in jawiki_cname_info_mapping: jawiki_cname_info_mapping[name] = []
                jawiki_cname_info_mapping[name].append((w_id, w_char_name))

    logging.info("加载 VNDB 数据...")
    with open("vndb_chars_master.json", encoding="utf-8") as f:
        vndb_cid_info = json.load(f)
    with open("vndb_name_map.json", encoding="utf-8") as f:
        vndb_cname_cid_mapping = json.load(f)
    vndb_cname_cid_mapping_clean = {}
    for name, cids in vndb_cname_cid_mapping.items():
        clean_key = name.replace(" ", "").lower()
        if clean_key not in vndb_cname_cid_mapping_clean:
            vndb_cname_cid_mapping_clean[clean_key] = []
        vndb_cname_cid_mapping_clean[clean_key].extend(cids)
    for k in vndb_cname_cid_mapping_clean:
        vndb_cname_cid_mapping_clean[k] = list(set(vndb_cname_cid_mapping_clean[k]))


    logging.info("加载 Bangumi 数据...")
    logging.info("加载 subject.jsonlines...")
    bgm_subjects_dict = {}
    with open("subject.jsonlines", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            bgm_subjects_dict[item["id"]] = item

    logging.info("加载 subject-characters.jsonlines...")
    bgm_cid_subid_mapping = {}
    with open("subject-characters.jsonlines", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            cid = item["character_id"]
            if cid not in bgm_cid_subid_mapping: bgm_cid_subid_mapping[cid] = []
            bgm_cid_subid_mapping[cid].append(item)

    return (jp_surnames, jawiki, jawiki_cname_info_mapping, vndb_cid_info, 
            vndb_cname_cid_mapping_clean, bgm_subjects_dict, bgm_cid_subid_mapping)


def run_pipeline():
    (jp_surnames, jawiki, jawiki_cname_info_mapping, vndb_cid_info, 
     vndb_cname_cid_mapping, bgm_subjects_dict, bgm_cid_subid_mapping) = load_static_mappings()
    
    gc.collect()

    stats = {"total": 0, "info_match": 0, "tags_match": 0, "no_zh": 0, "no_ja": 0}
    
    logging.info("开始流式处理 character.jsonlines...")
    
    with open("character.jsonlines", encoding="utf-8") as f_in, \
         open("character.jsonl", "w", encoding="utf-8") as f_out:
        
        for line in tqdm(f_in, desc="Processing"):
            cinfo = json.loads(line)
            stats["total"] += 1
            
            cinfobox = cinfo.get("infobox", "").replace("\r\n", "\n")


            def get_data(label, mode="info"):
                """
                :param mode: "info" 处理 |key=val, "alias" 处理 [label|val]
                """
                if mode == "info":
                    # 匹配 |key = value
                    pattern = rf"\|{label}\s*=\s*([^|}}\n]*)"
                elif mode == "alias":
                    # 匹配 [label|value]
                    pattern = rf"\[{label}\|([^\]]*)\]"
                found = re.findall(pattern, cinfobox)
                results = []
                for raw_item in found:
                    cleaned_text = clear(raw_item)
                    split_items = [x.strip() for x in re.split(r"[／/、]", cleaned_text) if x.strip()]
                    results.extend(split_items)
                return results

            raw_name = cinfo["name"]
            zh_name = get_data("简体中文名", "info") + get_data("第二中文名", "alias")
            ja_name = get_data("日文名", "alias") + get_data("第二日文名", "alias")
            kana_name = get_data("纯假名", "alias") + get_data("第二纯假名", "alias")
            en_name = get_data("英文名", "alias") + get_data("第二英文名", "alias")
            nick_name = get_data("昵称", "alias") + get_data("第二昵称", "alias")

            gender = get_data("性别", "info")
            
            # 提取额外信息放入 info
            birthday = get_data("生日", "info") 
            bloodt = get_data("血型", "info")
            height = get_data("身高", "info")
            weight = get_data("体重", "info")
    
            bwh_match = re.search(r"\|BWH\s*=\s*([^|}}\n]*)", cinfobox)
            if bwh_match:
                bwh_raw = bwh_match.group(1)
                bwh_cleaned = bwh_raw.replace("\t", "").replace("\n", "").replace("\r", "").replace("‎", "").replace("\u3000", "").strip()
                bwh = re.sub(r"\[\d+\]", "", bwh_cleaned).strip()
            else:
                bwh = "///"
              
            ## 角色相关作品的信息
            subs_raw = bgm_cid_subid_mapping.get(cinfo["id"], [])
            bgm_subjects = []
            bgm_subject_titles = set()
            for sr in subs_raw:
                s_detail = bgm_subjects_dict.get(sr["subject_id"])
                if s_detail:
                    bgm_subjects.append({
                        "id": sr["subject_id"], # 作品id
                        "name": s_detail["name"], # 作品名字
                        "zh_name": s_detail["name_cn"], # 作品中文名
                        "type": s_detail["type"], # 作品类型 (1:书籍 2: 动画 3:音乐 4: 游戏)
                        "role_type": sr["type"] # 角色在作品中的身份 (1: 主要角色 2: 配角 3: 客串)
                    })
                    bgm_subject_titles.add(s_detail["name"])
                    if s_detail["name_cn"]:
                        bgm_subject_titles.add(s_detail["name_cn"])

            ## 填充角色名称
            if isinstance(raw_name, str):
                raw_name = [raw_name]
            is_ja_sub = is_from_ja_subject(subs_raw, bgm_subjects_dict)
            is_zh_sub = is_from_zh_subject(subs_raw, bgm_subjects_dict)
            if not zh_name:
                for n in raw_name:
                    if (is_zh_sub or not is_ja_sub) and is_zh_name(n):
                        zh_name.append(n)
                if not zh_name: # 尝试繁转简
                    for ja_n in (ja_name + raw_name):
                        if re.fullmatch(r"[\u4E00-\u9FFF· ]+", ja_n):
                            zh_name.append(t2s_converter.convert(ja_n.replace(" ", "")))
            if not zh_name:
                stats["no_zh"] += 1
                # logging.warning(f"{json.dumps(content, ensure_ascii=False, indent=4)}未获取到中文名")
                # continue

            if not ja_name:
                for n in raw_name:
                    if ((n not in zh_name or is_ja_sub) and not is_english_with_symbols(n) and is_japanese(n)): ## or is_jp_name(n, jp_surnames) ##过于耗时
                        if not is_zh_sub or include_japanese(n):
                            ja_name.append(n)
            if not ja_name and not kana_name:  # noqa: SIM114
                stats['no_ja'] += 1
                # logging.warning(f"{json.dumps(content, ensure_ascii=False, indent=4)}未获取到日文名")
                # continue
            elif not ja_name:
                stats["no_ja"] += 1
                # logging.warning(f"{json.dumps(content, ensure_ascii=False, indent=4)}未获取到日文名, 但有假名")

            # 匹配 VNDB
            matched_info = None
            search_names = list(set(zh_name + ja_name + en_name + raw_name + [n.replace(" ","") for n in ja_name]))
            for sn in search_names:
                c_ids = vndb_cname_cid_mapping.get(sn)
                if not c_ids: continue
                
                if len(c_ids) == 1:
                    matched_info = vndb_cid_info[c_ids[0]].copy()
                else:
                    # 存在重名，开始对比作品集
                    for cid in c_ids:
                        v_char = vndb_cid_info[cid]
                        v_subs = v_char.get("subjects", [])
                        # 全等比对
                        if any(vs in bgm_subject_titles for vs in v_subs):
                            matched_info = v_char.copy()
                            break
                        # 模糊对比
                        elif any(subject_name_compare(vs, bs) for vs in v_subs for bs in bgm_subject_titles):
                            matched_info = v_char.copy()
                            break
                if matched_info:
                    stats['info_match'] += 1
                    break

            # 标签分析
            tags, ext_names = analyze(search_names, bgm_subjects, cinfo.get("summary", ""), jawiki, jawiki_cname_info_mapping)
            if matched_info:
                ext_names.append(matched_info.get("name", ""))
                # 提取 VNDB 英文名
                v_latin = matched_info.get("latin", "")
                if v_latin and v_latin not in en_name:
                    en_name.append(v_latin)

                processed_info = {}
                if matched_info.get("id"):
                    processed_info["vndb_id"] = matched_info["id"]
                if matched_info.get("traits"):
                    processed_info["traits"] = matched_info["traits"]
                for key in ["bloodt", "cup", "height", "weight", "age"]:
                    value = matched_info.get(key)
                    if value and value not in [None, "", "null", "unknown"]:
                        processed_info[key] = value
                    else:
                        processed_info[key] = ""
                # 将 bust/waist/hip 合并为 bwh
                bust_val = matched_info.get("bust")
                waist_val = matched_info.get("waist")
                hip_val = matched_info.get("hip")
                bust_str = str(bust_val) if bust_val and bust_val not in [None, "", "null", "unknown", "0"] else ""
                waist_str = str(waist_val) if waist_val and waist_val not in [None, "", "null", "unknown", "0"] else ""
                hip_str = str(hip_val) if hip_val and hip_val not in [None, "", "null", "unknown", "0"] else ""
                processed_info["bwh"] = f"{bust_str}/{waist_str}/{hip_str}"
                # 将 b_month/b_day 合并为 birthday
                b_month_val = matched_info.get("b_month")
                b_day_val = matched_info.get("b_day")
                month_str = str(b_month_val) if b_month_val and b_month_val not in [None, "", "null", "unknown"] else ""
                day_str = str(b_day_val) if b_day_val and b_day_val not in [None, "", "null", "unknown"] else ""
                if month_str and day_str:
                    processed_info["birthday"] = f"{month_str}月{day_str}日"
                elif month_str:
                    processed_info["birthday"] = f"{month_str}月"
                else:
                    processed_info["birthday"] = ""
                matched_info = processed_info
            ## 去除无意义标签
            tags = [t for t in tags if len(t) > 1]
            if tags: stats["tags_match"] += 1

            # 处理假名
            kana_from_ja = [n for n in ja_name if re.fullmatch(r"[\u3040-\u309F\u30A0-\u30FF・ ]+", n)]
            kana_name = list(set(kana_name + kana_from_ja))
            kana_name = [k for k in kana_name if len(k) > 1]

            default_info = {k: "" for k in ["vndb_id", "bloodt", "cup", "height", "weight", "age", "bwh", "birthday", "traits"]}
            info = {**default_info, **(matched_info or {})}

            info["birthday"] = birthday[0].strip() if birthday else ""
            info["bloodt"] = bloodt[0].upper().strip() if bloodt else ""
            info["height"] = height[0].replace("C", "c").replace("M", "m").strip() if height else ""
            info["weight"] = weight[0].replace("K", "k").replace("G", "g").strip() if weight else ""
            info["bwh"] = bwh
            info["cup"] = info["cup"].upper()
            
            result = {
                "id": cinfo["id"],
                "zh": list(set(zh_name)),
                "ja": list(set(ja_name)),
                "en": list(set(en_name)),
                "kana": list(set(kana_name)),
                "nick_name": list(set(nick_name)),
                "gender": gender[0] if gender else "",
                "subjects": bgm_subjects,
                "info": info if info else None,
                "tags": tags,
                "summary": t2s_converter.convert(cinfo.get("summary", ""))
            }
            f_out.write(json.dumps(result, ensure_ascii=False) + "\n")

    with open("report.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=4)
    logging.info(f"总数: {stats['total']}, 匹配到 VNDB 人数: {stats['info_match']}, 匹配到标签人数: {stats['tags_match']}, 未获取到中文名人数: {stats['no_zh']}, 未获取到日文名或假名人数: {stats['no_ja']}。")

    with open("maybe_ja_names.txt", "w", encoding="utf-8") as file:
        json.dump(maybe_ja_names, file, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    run_pipeline()


