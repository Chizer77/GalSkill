import json
import datetime

def build_index(input_path, output_path):
    index = []
    offset = 0
    
    with open(input_path, 'rb') as f:
        for line in f:
            length = len(line)
            data = json.loads(line.decode('utf-8'))
            
            # 提取所有可能的检索词并去重
            keys = set()
            keys.update(data.get('zh', []))
            keys.update(data.get('en', []))
            keys.update(data.get('ja', []))
            keys.update(data.get('kana', []))
            keys.update(data.get('nick_name', []))
            # 过滤掉空字符串
            keywords = [k for k in keys if k]
            
            index.append({
                "k": keywords,
                "o": offset,
                "l": length
            })
            offset += length

    result = {
        "version": datetime.datetime.now().strftime("%Y%m%d%H%M%S"),
        "data": index
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))

build_index('character.jsonl', 'names_index.json')