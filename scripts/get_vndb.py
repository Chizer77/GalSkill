import os
import json
import logging
import re

logging.basicConfig(level=logging.INFO, format="%(message)s")

import re

def clean_description(text):
    if not text:
        return ""
    # [url=...]文字[/url]
    text = re.sub(r'\[url=.*?\](.*?)\[/url\]', r'\1', text)
    # 删除 [Edited from ...]
    text = re.sub(r'\[Edited from.*?\]', '', text, flags=re.IGNORECASE | re.DOTALL)
    # 删除 [xxx] 或 [/xxx] 
    text = re.sub(r'\[/?.*?\]', '', text)
    # 处理换行符、转义字符和首尾空格
    text = text.replace('\\n', '\n').replace('\\"', '"').strip()
    # 将三个以上的连续换行合并为两个
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text

def export_vndb_data():
    db_path = os.path.join("vndb", "db")
    
    logging.info("Step 1: 加载 traits 关联...")
    chars_traits = {}
    with open(os.path.join(db_path, "chars_traits"), encoding="utf-8") as f:
        for line in f:
            parts = line.split("\t")
            if parts[0] not in chars_traits: chars_traits[parts[0]] = []
            chars_traits[parts[0]].append(parts[1]) ## id->tid

    traits = {}
    with open(os.path.join(db_path, "traits"), encoding="utf-8") as f:
        for line in f:
            parts = line.split("\t")
            traits[parts[0]] = parts[7] ## tid-> trait_name

    traits_parent = {}
    with open(os.path.join(db_path, "traits_parents"), encoding="utf-8") as f:
        for line in f:
            parts = line.split("\t")
            traits_parent[parts[0]] = parts[1] ## tid -> parent_tid

    logging.info("Step 2: 加载作品标题...")
    vn_titles = {}
    with open(os.path.join(db_path, "vn_titles"), encoding="utf-8") as f:
        for line in f:
            parts = line.split("\t")
            if parts[1] == 'ja' or parts[1] == 'zh' or parts[2] == 't':
                if parts[0] not in vn_titles: vn_titles[parts[0]] = []
                vn_titles[parts[0]].append(parts[3]) ## vid->title

    chars_vns = {}
    with open(os.path.join(db_path, "chars_vns"), encoding="utf-8") as f:
        for line in f:
            parts = line.split("\t")
            if parts[0] not in chars_vns: chars_vns[parts[0]] = []
            chars_vns[parts[0]].append(parts[1]) ## id->vid

    
    logging.info("Step 3: 预处理 名字-> id 表...")
    name_chars_mapping = {}
    id_latin_mapping = {}
    id_name_mapping = {}
    with open(os.path.join(db_path, "chars_alias"), encoding="utf-8") as f:
        for line in f:
            p_alias = line.split("\t")
            cid, alias_name, latin_name = p_alias[0], p_alias[2], p_alias[3]
            if alias_name not in name_chars_mapping:
                name_chars_mapping[alias_name] = []
            name_chars_mapping[alias_name].append(cid) ## char_name -> [id]
            id_latin_mapping[cid] = latin_name if latin_name not in ["\\N", "\\N\n"] else ""
            id_name_mapping[cid] = alias_name if alias_name not in ["\\N", "\\N\n"] else ""

    logging.info("Step 4: 构建角色详情并关联作品...")
    vndb_chars = {}
    with open(os.path.join(db_path, "chars"), encoding="utf-8") as f:
        for line in f:
            p = [None if x in ["\\N", ""] else x for x in line.split("\t")]
            char_id = p[0]
            
            # 关联作品
            char_subjects = []
            for vn_id in chars_vns.get(char_id, []):
                if vn_id in vn_titles:
                    char_subjects.extend(vn_titles[vn_id])
            
            # 处理生日
            raw_bday = p[13]
            bday_val = int(raw_bday) if raw_bday and str(raw_bday).isdigit() and raw_bday != "0" else 0
            b_month = bday_val // 100 if bday_val > 0 else None
            b_day = bday_val % 100 if bday_val > 0 else None

            description_raw = p[17]
            clean_desc = clean_description(description_raw)
            
            c_info = {
                "id": char_id,
                "bloodt": p[2],
                "cup": p[3],
                "gender": p[6] if p[6] else p[4],
                "name": id_name_mapping.get(char_id, ""),
                "latin": id_latin_mapping.get(char_id, ""),
                "bust": p[10],
                "waist": p[11],
                "hip": p[12],
                "b_month": b_month,
                "b_day": b_day,
                "height": p[14],
                "weight": p[15],
                "age": p[16],
                "description": clean_desc,
                "subjects": list(set(char_subjects)),
                "traits": {}
            }
            vndb_chars[char_id] = c_info
            
            # 将主名字也加入索引映射
            # main_name = p[8]
            # if main_name:
            #     if main_name not in name_chars_mapping:
            #         name_chars_mapping[main_name] = []
            #     if char_id not in name_chars_mapping[main_name]:
            #         name_chars_mapping[main_name].append(char_id)

    logging.info("Step 5: 构建特征标签树...")
    for c_id, t_ids in chars_traits.items():
        if c_id not in vndb_chars: continue
        t_dict = {}
        for tid in t_ids:
            if tid not in traits: continue
            curr_name = traits[tid]
            path = []
            tmp_id = tid
            while tmp_id in traits_parent:
                tmp_id = traits_parent[tmp_id]
                path.append(traits.get(tmp_id, "unknown"))
            root = path[-1] if path else curr_name
            if root not in t_dict: t_dict[root] = []
            t_dict[root].append(curr_name)
        vndb_chars[c_id]["traits"] = t_dict

    logging.info("Step 6: 保存到文件...")
    with open("vndb_chars_master.json", "w", encoding="utf-8") as f:
        json.dump(vndb_chars, f, ensure_ascii=False, indent=2)
    
    with open("vndb_name_map.json", "w", encoding="utf-8") as f:
        json.dump(name_chars_mapping, f, ensure_ascii=False, indent=2)

    logging.info(f"文件保存到{os.getcwd()}")

if __name__ == "__main__":
    export_vndb_data()