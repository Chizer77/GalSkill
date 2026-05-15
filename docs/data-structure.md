# Data Structure

## character.jsonl

A newline-delimited JSON file (~188MB, 200K+ characters). Each line is a character object.

```json
{
    "id": "bangumi角色id(可通过 https://bgm.tv/character/{id} 访问)",
    "zh": ["角色中文名"],
    "jp": ["角色日文名"],
    "en": ["角色英文名"],
    "kana": ["角色日文假名"],
    "gender": "性别",
    "subjects": [
        {
            "id": "作品id",
            "name": "作品名称",
            "zh_name": "作品中文名",
            "type": "作品类型(1:书籍 2:动画 3:音乐 4:游戏)",
            "role_type": "角色类型(1:主要角色 2:配角 3:客串)"
        }
    ],
    "info": {
        "vndb_id": "VNDB角色id(可通过 https://vndb.org/{id} 访问)",
        "bloodt": "血型",
        "cup": "罩杯",
        "height": 身高(cm),
        "weight": 体重(kg),
        "age": "年龄",
        "bwh": "三围",
        "birthday": "生日",
        "traits": {"特征分类": ["具体特征"]}
    },
    "tags": ["从维基百科与bangumi分析得到的角色标签"],
    "summary": "角色简介"
}
```

Field details:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Bangumi character ID, link: `https://bgm.tv/character/{id}` |
| `zh` | string[] | Chinese names |
| `jp` | string[] | Japanese names |
| `en` | string[] | English names |
| `kana` | string[] | Kana readings |
| `gender` | string | Gender |
| `subjects` | object[] | Works the character appears in |
| `subjects[].type` | number | 1=book, 2=anime, 3=music, 4=game |
| `subjects[].role_type` | number | 1=main, 2=supporting, 3=cameo |
| `info.vndb_id` | string | VNDB character ID, link: `https://vndb.org/{id}` |
| `info.traits` | object | Categorized character traits |
| `tags` | string[] | Analyzed tags from Wikipedia & Bangumi |
| `summary` | string | Character description |

## CDN Shard Format

Search index is sharded by the first character of each keyword:

```json
{
    "d": [
        {
            "k": ["keyword1", "keyword2"],
            "f": "filename",
            "o": "byte offset in file",
            "l": "data length (bytes)"
        }
    ]
}
```

## master.json

Versioned entry point for the shard index:

```json
{
    "v": "version string",
    "m": {
        "a": "shard filename for first-char 'a'",
        "b": "shard filename for first-char 'b'"
    }
}
```

## Data Sources

- [Bangumi](https://bgm.tv/) — Character info and work affiliations
- [VNDB](https://vndb.org/) — Character traits and attributes
- [Japanese Wikipedia](https://ja.wikipedia.org/) — Character tags and descriptions

Please comply with each platform's license agreement.
