export interface KanaItem {
  id: string
  hiragana: string
  katakana: string
  romaji: string
  pinyin: string      // 汉语拼音拟音/拼读参考 (例如: "ka [卡]", "shi [西]")
  isSpecial?: boolean // 是否为特殊音 (如 し、ち、つ、ふ)
  specialTip?: string // 特殊发音避坑指南
  kanjiOrigin: string // 汉字字源演变
  mnemonic: string    // 记忆口诀
  example: {
    word: string
    reading: string
    meaning: string
  }
  row: string
  col: string
  type: 'seion' | 'dakuon' | 'handakuon' | 'youon'
  isEmpty?: boolean
}

export interface PinyinRowMeta {
  key: string
  name: string
  consonant: string   // 声母 (如: k, s, t, n...)
  desc: string        // 声母发音说明
  items: KanaItem[]
}

// 50音 清音表 (按 声母行 × 韵母列 拼音矩阵排布)
export const PINYIN_SEION_ROWS: PinyinRowMeta[] = [
  {
    key: 'a',
    name: 'あ行 (元音行)',
    consonant: 'Ø (零声母)',
    desc: '纯元音发音，口型自然平稳，不要像汉语那么饱满用力',
    items: [
      { id: 'a', hiragana: 'あ', katakana: 'ア', romaji: 'a', pinyin: 'a [啊]', kanjiOrigin: '安 / 阿', mnemonic: '像“安”字草书；片假名像“阿”左耳旁', example: { word: '雨', reading: 'あめ', meaning: '雨水' }, row: 'a', col: 'a', type: 'seion' },
      { id: 'i', hiragana: 'い', katakana: 'イ', romaji: 'i', pinyin: 'i [衣]', kanjiOrigin: '以 / 伊', mnemonic: '像“以”字左半边；片假名像单人旁', example: { word: '犬', reading: 'いぬ', meaning: '小狗' }, row: 'a', col: 'i', type: 'seion' },
      { id: 'u', hiragana: 'う', katakana: 'ウ', romaji: 'u', pinyin: 'u [乌/屋]', kanjiOrigin: '宇 / 宇', isSpecial: true, specialTip: '发音不要嘟嘴向前噘起，嘴角向两侧微缩微扁', mnemonic: '像人在弯腰行礼；片假名像宇字头', example: { word: '海', reading: 'うみ', meaning: '大海' }, row: 'a', col: 'u', type: 'seion' },
      { id: 'e', hiragana: 'え', katakana: 'エ', romaji: 'e', pinyin: 'e [诶/哎]', kanjiOrigin: '衣 / 江', mnemonic: '像“衣”的连笔草书；片假名就是汉字“工”', example: { word: '駅', reading: 'えき', meaning: '车站' }, row: 'a', col: 'e', type: 'seion' },
      { id: 'o', hiragana: 'お', katakana: 'オ', romaji: 'o', pinyin: 'o [喔/欧]', kanjiOrigin: '於 / 於', mnemonic: '像“於”字草写；片假名像汉字“才”', example: { word: 'お茶', reading: 'おちゃ', meaning: '茶水' }, row: 'a', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ka',
    name: 'か行',
    consonant: 'k [科]',
    desc: '声母 k 与 a i u e o 拼读，气流比汉语拼音更轻',
    items: [
      { id: 'ka', hiragana: 'か', katakana: 'カ', romaji: 'ka', pinyin: 'ka [卡]', kanjiOrigin: '加 / 加', mnemonic: '“加”字草写；片假名就是汉字“力”', example: { word: '傘', reading: 'かさ', meaning: '雨伞' }, row: 'ka', col: 'a', type: 'seion' },
      { id: 'ki', hiragana: 'き', katakana: 'キ', romaji: 'ki', pinyin: 'ki [期/七]', kanjiOrigin: '幾 / 幾', mnemonic: '像一把琴键或钥匙(Key)', example: { word: '木', reading: 'き', meaning: '树木' }, row: 'ka', col: 'i', type: 'seion' },
      { id: 'ku', hiragana: 'く', katakana: 'ク', romaji: 'ku', pinyin: 'ku [哭/库]', kanjiOrigin: '久 / 久', mnemonic: '像小鸟张开尖嘴；片假名像“久”字上半截', example: { word: '車', reading: 'くるま', meaning: '汽车' }, row: 'ka', col: 'u', type: 'seion' },
      { id: 'ke', hiragana: 'け', katakana: 'ケ', romaji: 'ke', pinyin: 'ke [开/科]', kanjiOrigin: '計 / 介', mnemonic: '像一根长竹竿；片假名像竹子半边', example: { word: '今朝', reading: 'けさ', meaning: '今晨' }, row: 'ka', col: 'e', type: 'seion' },
      { id: 'ko', hiragana: 'こ', katakana: 'コ', romaji: 'ko', pinyin: 'ko [阔/扣]', kanjiOrigin: '己 / 己', mnemonic: '像两条上下平行曲线；片假名像开口方框', example: { word: '声', reading: 'こえ', meaning: '声音' }, row: 'ka', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'sa',
    name: 'さ行',
    consonant: 's [思] / x',
    desc: '⚠️ 注意：第二位不是 si，而是读类似汉语拼音 xi [西]！',
    items: [
      { id: 'sa', hiragana: 'さ', katakana: 'サ', romaji: 'sa', pinyin: 'sa [萨]', kanjiOrigin: '左 / 散', mnemonic: '像杀气的短刀；片假名像草字头', example: { word: '桜', reading: 'さくら', meaning: '樱花' }, row: 'sa', col: 'a', type: 'seion' },
      { id: 'shi', hiragana: 'し', katakana: 'シ', romaji: 'shi', pinyin: 'xi [西/吸] ⚠️', isSpecial: true, specialTip: '【特殊音】不读 si，读类似汉语拼音的 xi(西)！舌面贴上颚前部轻吹气', kanjiOrigin: '之 / 之', mnemonic: '平假名像钓鱼钩；片假名是三点水从下往上提', example: { word: '塩', reading: 'しお', meaning: '食盐' }, row: 'sa', col: 'i', type: 'seion' },
      { id: 'su', hiragana: 'す', katakana: 'ス', romaji: 'su', pinyin: 'su [苏/撕]', kanjiOrigin: '寸 / 須', isSpecial: true, specialTip: '嘴唇不要噘起，齿间缝隙微弱送气', mnemonic: '像体操吊环；片假名像汉字“又”缺一笔', example: { word: '寿司', reading: 'すし', meaning: '寿司' }, row: 'sa', col: 'u', type: 'seion' },
      { id: 'se', hiragana: 'せ', katakana: 'セ', romaji: 'se', pinyin: 'se [塞/色]', kanjiOrigin: '世 / 世', mnemonic: '演变自“世界”的“世”字', example: { word: '先生', reading: 'せんせい', meaning: '老师' }, row: 'sa', col: 'e', type: 'seion' },
      { id: 'so', hiragana: 'そ', katakana: 'ソ', romaji: 'so', pinyin: 'so [搜/缩]', kanjiOrigin: '曾 / 曾', mnemonic: '平假名像Z与C连写；片假名从上往下捺两笔', example: { word: '空', reading: 'そら', meaning: '天空' }, row: 'sa', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ta',
    name: 'た行',
    consonant: 't [特] / q / c',
    desc: '⚠️ 特殊音聚集行：chi 读 qi [七]，tsu 读 ci [粗/刺]',
    items: [
      { id: 'ta', hiragana: 'た', katakana: 'タ', romaji: 'ta', pinyin: 'ta [踏/他]', kanjiOrigin: '太 / 多', mnemonic: '像汉字“太”；片假名像汉字“夕”', example: { word: '卵', reading: 'たまご', meaning: '鸡蛋' }, row: 'ta', col: 'a', type: 'seion' },
      { id: 'chi', hiragana: 'ち', katakana: 'チ', romaji: 'chi', pinyin: 'qi [七/期] ⚠️', isSpecial: true, specialTip: '【特殊音】不读 ti，读类似汉语拼音的 qi(七)！', kanjiOrigin: '知 / 千', mnemonic: '像数字5反写；片假名就是汉字“千”', example: { word: '地図', reading: 'ちず', meaning: '地图' }, row: 'ta', col: 'i', type: 'seion' },
      { id: 'tsu', hiragana: 'つ', katakana: 'ツ', romaji: 'tsu', pinyin: 'ci [刺/次] ⚠️', isSpecial: true, specialTip: '【特殊音】最难发音之一：舌尖抵上齿背，发汉语“次/粗”的塞擦音，不噘嘴', kanjiOrigin: '川 / 川', mnemonic: '像一湾月牙；片假名像两眼落一滴泪', example: { word: '机', reading: 'つくえ', meaning: '书桌' }, row: 'ta', col: 'u', type: 'seion' },
      { id: 'te', hiragana: 'て', katakana: 'テ', romaji: 'te', pinyin: 'te [特/贴]', kanjiOrigin: '天 / 天', mnemonic: '像伸出的手掌(Te)；片假名像大写T加撇', example: { word: '手', reading: 'て', meaning: '手掌' }, row: 'ta', col: 'e', type: 'seion' },
      { id: 'to', hiragana: 'と', katakana: 'ト', romaji: 'to', pinyin: 'to [托/脱]', kanjiOrigin: '止 / 止', mnemonic: '像脚趾踢足球；片假名像汉字“卜”', example: { word: '友達', reading: 'ともだち', meaning: '朋友' }, row: 'ta', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'na',
    name: 'な行',
    consonant: 'n [讷/呢]',
    desc: '鼻音行，声母 n 与元音顺畅拼读',
    items: [
      { id: 'na', hiragana: 'な', katakana: 'ナ', romaji: 'na', pinyin: 'na [那/纳]', kanjiOrigin: '奈 / 奈', mnemonic: '像“奈”字的草书', example: { word: '夏', reading: 'なつ', meaning: '夏天' }, row: 'na', col: 'a', type: 'seion' },
      { id: 'ni', hiragana: 'に', katakana: 'ニ', romaji: 'ni', pinyin: 'ni [你/泥]', kanjiOrigin: '仁 / 二', mnemonic: '左边一竖右边二；片假名就是汉字“二”', example: { word: '肉', reading: 'にく', meaning: '肉类' }, row: 'na', col: 'i', type: 'seion' },
      { id: 'nu', hiragana: 'ぬ', katakana: 'ヌ', romaji: 'nu', pinyin: 'nu [奴/努]', kanjiOrigin: '奴 / 奴', mnemonic: '像筷子夹面条打了结；片假名像汉字“又”', example: { word: '布', reading: 'ぬの', meaning: '布料' }, row: 'na', col: 'u', type: 'seion' },
      { id: 'ne', hiragana: 'ね', katakana: 'ネ', romaji: 'ne', pinyin: 'ne [捏/呢]', kanjiOrigin: '祢 / 祢', mnemonic: '像小猫卷起长尾巴(Neko)；片假名像示字旁', example: { word: '猫', reading: 'ねこ', meaning: '猫咪' }, row: 'na', col: 'e', type: 'seion' },
      { id: 'no', hiragana: 'の', katakana: 'ノ', romaji: 'no', pinyin: 'no [糯/诺]', kanjiOrigin: '乃 / 乃', mnemonic: '画一个圆圈；片假名就是简单的一撇', example: { word: '飲み物', reading: 'のみもの', meaning: '饮料' }, row: 'na', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ha',
    name: 'は行',
    consonant: 'h [喝] / f',
    desc: '⚠️ 注意：fu 是双唇吹气微弱音，不是汉语咬下唇的“夫(fu)”！',
    items: [
      { id: 'ha', hiragana: 'は', katakana: 'ハ', romaji: 'ha', pinyin: 'ha [哈]', kanjiOrigin: '波 / 八', mnemonic: '左边竖右边圈；片假名就是汉字“八”', example: { word: '花', reading: 'はな', meaning: '花朵' }, row: 'ha', col: 'a', type: 'seion' },
      { id: 'hi', hiragana: 'ひ', katakana: 'ヒ', romaji: 'hi', pinyin: 'hi [希/吸]', kanjiOrigin: '比 / 比', mnemonic: '像一个微笑嘴角；片假名像汉字“匕”', example: { word: '光', reading: 'ひかり', meaning: '光线' }, row: 'ha', col: 'i', type: 'seion' },
      { id: 'fu', hiragana: 'ふ', katakana: 'フ', romaji: 'fu', pinyin: 'hu/fu [呼/夫] ⚠️', isSpecial: true, specialTip: '【特殊音】双唇音！切忌上门牙咬下嘴唇，上下唇自然靠近吹气(像吹灭蜡烛)', kanjiOrigin: '不 / 不', mnemonic: '像富士山；片假名像倒挂的弯钩', example: { word: '冬', reading: 'ふゆ', meaning: '冬天' }, row: 'ha', col: 'u', type: 'seion' },
      { id: 'he', hiragana: 'へ', katakana: 'ヘ', romaji: 'he', pinyin: 'he [黑/嗨]', kanjiOrigin: '部 / 部', mnemonic: '平假片假完全一样，都像小山坡', example: { word: '部屋', reading: 'へや', meaning: '房间' }, row: 'ha', col: 'e', type: 'seion' },
      { id: 'ho', hiragana: 'ほ', katakana: 'ホ', romaji: 'ho', pinyin: 'ho [豁/霍]', kanjiOrigin: '保 / 保', mnemonic: '比は多了一横；片假名像汉字“木”', example: { word: '本', reading: 'ほん', meaning: '书本' }, row: 'ha', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ma',
    name: 'ま行',
    consonant: 'm [摸/么]',
    desc: '双唇闭合鼻音 m 与元音拼读',
    items: [
      { id: 'ma', hiragana: 'ま', katakana: 'マ', romaji: 'ma', pinyin: 'ma [妈/麻]', kanjiOrigin: '末 / 末', mnemonic: '像汉字“末”；片假名像数字7带一点', example: { word: '町', reading: 'まち', meaning: '城镇' }, row: 'ma', col: 'a', type: 'seion' },
      { id: 'mi', hiragana: 'み', katakana: 'ミ', romaji: 'mi', pinyin: 'mi [咪/米]', kanjiOrigin: '美 / 三', mnemonic: '像“美”的草书；片假名像三根横线', example: { word: '水', reading: 'みず', meaning: '清水' }, row: 'ma', col: 'i', type: 'seion' },
      { id: 'mu', hiragana: 'む', katakana: 'ム', romaji: 'mu', pinyin: 'mu [木/母]', kanjiOrigin: '武 / 牟', mnemonic: '像牛耳朵带环；片假名像三角形缺底边', example: { word: '虫', reading: 'むし', meaning: '昆虫' }, row: 'ma', col: 'u', type: 'seion' },
      { id: 'me', hiragana: 'め', katakana: 'メ', romaji: 'me', pinyin: 'me [咩/妹]', kanjiOrigin: '女 / 女', mnemonic: '像一只眯缝眼；片假名像一个叉号', example: { word: '目', reading: 'め', meaning: '眼睛' }, row: 'ma', col: 'e', type: 'seion' },
      { id: 'mo', hiragana: 'も', katakana: 'モ', romaji: 'mo', pinyin: 'mo [摸/磨]', kanjiOrigin: '毛 / 毛', mnemonic: '像鱼钩穿两横；片假名像汉字“毛”', example: { word: '森', reading: 'もり', meaning: '森林' }, row: 'ma', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ya',
    name: 'や行 (半元音)',
    consonant: 'y [衣/也]',
    desc: '半元音，仅有 ya, yu, yo 三个音节，其余与 a 行重合',
    items: [
      { id: 'ya', hiragana: 'や', katakana: 'ヤ', romaji: 'ya', pinyin: 'ya [鸭/也]', kanjiOrigin: '也 / 也', mnemonic: '演变自汉字“也”', example: { word: '山', reading: 'やま', meaning: '高山' }, row: 'ya', col: 'a', type: 'seion' },
      { id: 'empty_yi', hiragana: '', katakana: '', romaji: '', pinyin: '—', kanjiOrigin: '', mnemonic: '', example: { word: '', reading: '', meaning: '' }, row: 'ya', col: 'i', type: 'seion', isEmpty: true },
      { id: 'yu', hiragana: 'ゆ', katakana: 'ユ', romaji: 'yu', pinyin: 'yu [优/由]', kanjiOrigin: '由 / 由', mnemonic: '像温泉热气标志；片假名像“由”缺顶', example: { word: '雪', reading: 'ゆき', meaning: '雪花' }, row: 'ya', col: 'u', type: 'seion' },
      { id: 'empty_ye', hiragana: '', katakana: '', romaji: '', pinyin: '—', kanjiOrigin: '', mnemonic: '', example: { word: '', reading: '', meaning: '' }, row: 'ya', col: 'e', type: 'seion', isEmpty: true },
      { id: 'yo', hiragana: 'よ', katakana: 'ヨ', romaji: 'yo', pinyin: 'yo [哟/与]', kanjiOrigin: '与 / 与', mnemonic: '平假名像把手举起；片假名像汉字“彐”', example: { word: '夜', reading: 'よる', meaning: '夜晚' }, row: 'ya', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'ra',
    name: 'ら行 (弹舌音)',
    consonant: 'r / l [拉/罗]',
    desc: '舌尖快速轻弹上齿龈，介于汉语 l 和弱 r 之间，绝非大舌颤音',
    items: [
      { id: 'ra', hiragana: 'ら', katakana: 'ラ', romaji: 'ra', pinyin: 'ra/la [拉]', kanjiOrigin: '良 / 良', mnemonic: '像数字5少一横', example: { word: '桜', reading: 'さくら', meaning: '樱花' }, row: 'ra', col: 'a', type: 'seion' },
      { id: 'ri', hiragana: 'り', katakana: 'リ', romaji: 'ri', pinyin: 'ri/li [利/里]', kanjiOrigin: '利 / 利', mnemonic: '左短右长弧线；片假名就是立刀旁', example: { word: '林檎', reading: 'りんご', meaning: '苹果' }, row: 'ra', col: 'i', type: 'seion' },
      { id: 'ru', hiragana: 'る', katakana: 'ル', romaji: 'ru', pinyin: 'ru/lu [路/鲁]', kanjiOrigin: '留 / 流', mnemonic: '平假名带圈的3；片假名像汉字“儿”', example: { word: '留守', reading: 'るす', meaning: '不在家' }, row: 'ra', col: 'u', type: 'seion' },
      { id: 're', hiragana: 'れ', katakana: 'レ', romaji: 're', pinyin: 're/le [来/勒]', kanjiOrigin: '礼 / 礼', mnemonic: '右侧向外翘起；片假名像对勾✔', example: { word: '歴史', reading: 'れきし', meaning: '历史' }, row: 'ra', col: 'e', type: 'seion' },
      { id: 'ro', hiragana: 'ろ', katakana: 'ロ', romaji: 'ro', pinyin: 'ro/lo [罗/落]', kanjiOrigin: '吕 / 吕', mnemonic: '平假名就是数字3；片假名就是汉字“口”', example: { word: '蝋燭', reading: 'ろうそく', meaning: '蜡烛' }, row: 'ra', col: 'o', type: 'seion' },
    ]
  },
  {
    key: 'wa',
    name: 'わ行 + 拨音',
    consonant: 'w [瓦] / n',
    desc: '包含现代日语仅存的 wa、助词专用 wo 以及唯一单辅音拨音 ん',
    items: [
      { id: 'wa', hiragana: 'わ', katakana: 'ワ', romaji: 'wa', pinyin: 'wa [哇/挖]', kanjiOrigin: '和 / 和', mnemonic: '像白天鹅；片假名像弯顶房屋', example: { word: '私', reading: 'わたし', meaning: '我' }, row: 'wa', col: 'a', type: 'seion' },
      { id: 'empty_wi', hiragana: '', katakana: '', romaji: '', pinyin: '—', kanjiOrigin: '', mnemonic: '', example: { word: '', reading: '', meaning: '' }, row: 'wa', col: 'i', type: 'seion', isEmpty: true },
      { id: 'empty_wu', hiragana: '', katakana: '', romaji: '', pinyin: '—', kanjiOrigin: '', mnemonic: '', example: { word: '', reading: '', meaning: '' }, row: 'wa', col: 'u', type: 'seion', isEmpty: true },
      { id: 'empty_we', hiragana: '', katakana: '', romaji: '', pinyin: '—', kanjiOrigin: '', mnemonic: '', example: { word: '', reading: '', meaning: '' }, row: 'wa', col: 'e', type: 'seion', isEmpty: true },
      { id: 'wo', hiragana: 'を', katakana: 'ヲ', romaji: 'wo', pinyin: 'o [喔] ⚠️', isSpecial: true, specialTip: '现代日语实际读音同 o！专作宾格助词使用', kanjiOrigin: '远 / 乎', mnemonic: '现代专用宾格助词', example: { word: '本を読む', reading: 'ほんをよむ', meaning: '读书(助词)' }, row: 'wa', col: 'o', type: 'seion' },
    ]
  }
]

// 拨音单独列出
export const HATSUON_ITEM: KanaItem = {
  id: 'n',
  hiragana: 'ん',
  katakana: 'ン',
  romaji: 'n',
  pinyin: 'n [嗯/鼻音]',
  isSpecial: true,
  specialTip: '【唯一单辅音拨音】不带元音，通过鼻腔共鸣振动发音，发音长度占一拍',
  kanjiOrigin: '无 / 尓',
  mnemonic: '平假名像英文字母h；片假名一撇一挑',
  example: { word: '日本', reading: 'にほん', meaning: '日本' },
  row: 'n',
  col: 'n',
  type: 'seion'
}

// 扁平化全部清音数据（包含拨音），供听音测验、随机测试与全局检索复用
export const SEION_DATA: KanaItem[] = [
  ...PINYIN_SEION_ROWS.flatMap(r => r.items),
  HATSUON_ITEM
]

