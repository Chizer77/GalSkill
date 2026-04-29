import json
import datetime
import os
import hashlib
from collections import defaultdict

def build_all_chunked(input_path, info_dir, index_dir, num_data_chunks=32):
    os.makedirs(info_dir, exist_ok=True)
    os.makedirs(index_dir, exist_ok=True)

    chunk_handles = [open(os.path.join(info_dir, f"part_{i}.jsonl"), 'wb') for i in range(num_data_chunks)]
    
    index_shards = defaultdict(list)

    with open(input_path, 'rb') as f:
        for line in f:
            data = json.loads(line.decode('utf-8'))
            cid = str(data.get('id', ''))
            
            chunk_idx = int(hashlib.md5(cid.encode()).hexdigest(), 16) % num_data_chunks
            target_file = chunk_handles[chunk_idx]
            
            start_offset = target_file.tell()
            target_file.write(line)
            length = len(line)
            
            keys = set()
            for field in ['zh', 'en', 'ja', 'kana', 'nick_name']:
                keys.update(data.get(field, []))
            
            if cid:
                keys.add(cid)
            
            subjects = data.get('subjects', [])
            for sub in subjects:
                if isinstance(sub, dict):
                    if sub.get('name'): keys.add(sub['name'])
                    if sub.get('zh_name'): keys.add(sub['zh_name'])
                elif isinstance(sub, str):
                    keys.add(sub)

            keywords = [k for k in keys if k]
            
            entry = {
                "k": keywords,
                "f": f"part_{chunk_idx}.jsonl",
                "o": start_offset,
                "l": length
            }

            for k in keywords:
                first_char = k[0].lower()
                index_shards[first_char].append(entry)

    for h in chunk_handles:
        h.close()

    # 写入二级索引文件 (Shards)
    master_index = {}
    version = datetime.datetime.now().strftime("%Y%m%d%H%M%S")

    for char, entries in index_shards.items():
        # 过滤掉特殊字符作为文件名可能产生的问题
        safe_char = hashlib.md5(char.encode()).hexdigest()[:8] 
        shard_filename = f"shard_{safe_char}.json"
        
        shard_path = os.path.join(index_dir, shard_filename)
        with open(shard_path, 'w', encoding='utf-8') as f:
            json.dump({"v": version, "d": entries}, f, ensure_ascii=False, separators=(',', ':'))
        
        # Master Index
        master_index[char] = shard_filename

    with open(os.path.join(index_dir, 'master.json'), 'w', encoding='utf-8') as f:
        json.dump({"v": version, "m": master_index}, f, ensure_ascii=False, separators=(',', ':'))

    print(f"处理完成，二级索引已生成。一级索引：master.json")

if __name__ == "__main__":
    build_all_chunked('character.jsonl', 'upload/deploy/info', 'upload/deploy/index')