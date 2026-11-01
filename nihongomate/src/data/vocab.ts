import importedVocabulary from './importedVocabulary.json'
import { kanaToRomaji } from '../utils/kanaToRomaji'

export interface VocabItem {
  id: string
  kanji: string
  reading: string
  romaji?: string
  meaning: string
  partOfSpeech: string // 词性 (动词一类/二类/三类/形容词/副词/名词等)
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  examTag?: string      // 考点标签 (如: 分级练习高频、常考接续、敬语辨析)
  collocation?: string  // 常用固定搭配/惯用型
  sourceId?: string | number
  example?: {
    japanese: string
    furigana: string
    chinese: string
  }
}

// 包含 N5 ~ N1 的精选本地词库 (无网络纯端侧离线学习，带模拟练习考点与搭配)
const ORIGINAL_VOCAB: VocabItem[] = [
  // =========================================================================
  // ===================== N5 基础生存核心词汇 (精讲) =======================
  // =========================================================================
  {
    id: 'n5_1',
    kanji: '私',
    reading: 'わたし',
    romaji: 'watashi',
    meaning: '我 (通用自称)',
    partOfSpeech: '代词',
    level: 'N5',
    examTag: '基础高频',
    collocation: '私の本 (我的书)',
    example: { japanese: '私は学生です。', furigana: 'わたしはがくせいです。', chinese: '我是学生。' }
  },
  {
    id: 'n5_2',
    kanji: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaning: '吃',
    partOfSpeech: '动词二类',
    level: 'N5',
    examTag: '动词活用',
    collocation: 'ご飯を食べる (吃饭)',
    example: { japanese: '毎日朝ご飯を食べます。', furigana: 'まいにちあさごはんをたべます。', chinese: '每天吃早饭。' }
  },
  {
    id: 'n5_3',
    kanji: '飲む',
    reading: 'のむ',
    romaji: 'nomu',
    meaning: '喝、饮',
    partOfSpeech: '动词一类',
    level: 'N5',
    examTag: '动词て形 (飲んで)',
    collocation: '冷たい水を飲む (喝冰水)',
    example: { japanese: '冷たい水を飲みます。', furigana: 'つめたいみずをのみます。', chinese: '喝冰水。' }
  },
  {
    id: 'n5_4',
    kanji: '行く',
    reading: 'いく',
    romaji: 'iku',
    meaning: '去、前往',
    partOfSpeech: '动词一类',
    level: 'N5',
    examTag: '特例促音便 (行って)',
    collocation: '学校へ行く (去学校)',
    example: { japanese: '明日東京へ行きます。', furigana: 'あしたとうきょうへいきます。', chinese: '明天去东京。' }
  },
  {
    id: 'n5_5',
    kanji: '来る',
    reading: 'くる',
    romaji: 'kuru',
    meaning: '来',
    partOfSpeech: '动词三类',
    level: 'N5',
    examTag: 'カ变不规则活用',
    collocation: 'バスが来る (公交车来)',
    example: { japanese: '友達が家に来ました。', furigana: 'ともだちがいえにきました。', chinese: '朋友来我家了。' }
  },
  {
    id: 'n5_6',
    kanji: '見る',
    reading: 'みる',
    romaji: 'miru',
    meaning: '看、观看',
    partOfSpeech: '动词二类',
    level: 'N5',
    examTag: '二类动词基本',
    collocation: '映画を見る (看电影)',
    example: { japanese: '週末に映画を見ます。', furigana: 'しゅうまつにえいがをみます。', chinese: '周末看电影。' }
  },
  {
    id: 'n5_7',
    kanji: '聞く',
    reading: 'きく',
    romaji: 'kiku',
    meaning: '听、打听、问',
    partOfSpeech: '动词一类',
    level: 'N5',
    examTag: '一类动词イ音便 (聞いて)',
    collocation: '音楽を聞く / 道を聞く',
    example: { japanese: '先生の話をよく聞きます。', furigana: 'せんせいのはなしをよくききます。', chinese: '认真听老师讲话。' }
  },
  {
    id: 'n5_8',
    kanji: '買う',
    reading: 'かう',
    romaji: 'kau',
    meaning: '买、购买',
    partOfSpeech: '动词一类',
    level: 'N5',
    examTag: '日常生活必考',
    collocation: 'お土産を買う (买特产)',
    example: { japanese: '駅前でパンを買いました。', furigana: 'えきまえでパンをかいました。', chinese: '在车站前买了面包。' }
  },
  {
    id: 'n5_9',
    kanji: '新しい',
    reading: 'あたらしい',
    romaji: 'atarashii',
    meaning: '崭新的、新鲜的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '形容词活用 (新しくない)',
    collocation: '新しい服 (新衣服)',
    example: { japanese: '新しいスマートフォンを買った。', furigana: 'あたらしいスマートフォンをかった。', chinese: '买了部新手机。' }
  },
  {
    id: 'n5_10',
    kanji: '古い',
    reading: 'ふるい',
    romaji: 'furui',
    meaning: '陈旧的、年久的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '反义词对比',
    collocation: '古い建物 (老旧建筑)',
    example: { japanese: 'この辞書は少し古いですが役に立ちます。', furigana: 'このじしょはすこしふるいですがやくにたちます。', chinese: '这本词典虽然有点旧但很管用。' }
  },
  {
    id: 'n5_11',
    kanji: '大きい',
    reading: 'おおきい',
    romaji: 'ookii',
    meaning: '大的、巨大的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '长音书写 (おお)',
    collocation: '声が大きい (声音大)',
    example: { japanese: '大きい公園を散歩しました。', furigana: 'おおきいこうえんをさんぽしました。', chinese: '在大型公园散步了。' }
  },
  {
    id: 'n5_12',
    kanji: '小さい',
    reading: 'ちいさい',
    romaji: 'chiisai',
    meaning: '小的、微小的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '促音/长音辨析',
    collocation: '小さい声 (小声)',
    example: { japanese: '庭に小さい花が咲いています。', furigana: 'にわにちいさいはながさいています。', chinese: '院子里开着小花。' }
  },
  {
    id: 'n5_13',
    kanji: '高い',
    reading: 'たかい',
    romaji: 'takai',
    meaning: '高的；昂贵的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '一词多义必考',
    collocation: '値段が高い / 背が高い',
    example: { japanese: 'この時計はとても高いです。', furigana: 'このとけいはとてもたかいです。', chinese: '这块手表非常贵。' }
  },
  {
    id: 'n5_14',
    kanji: '安い',
    reading: 'やすい',
    romaji: 'yasui',
    meaning: '便宜的',
    partOfSpeech: '形容词 (い形)',
    level: 'N5',
    examTag: '汉字书写题',
    collocation: '安くて美味しい (物美价廉)',
    example: { japanese: 'この食堂の料理は安いです。', furigana: 'このしょくどうのりょうりはやすいです。', chinese: '这家食堂的饭菜很便宜。' }
  },
  {
    id: 'n5_15',
    kanji: '時間',
    reading: 'じかん',
    romaji: 'jikan',
    meaning: '时间；小时',
    partOfSpeech: '名词',
    level: 'N5',
    examTag: '量词与时间表达',
    collocation: '時間がない (没时间)',
    example: { japanese: 'もう約束の時間です。', furigana: 'もうやくそくのじかんです。', chinese: '已经到约定的时间了。' }
  },
  {
    id: 'n5_16',
    kanji: '大丈夫',
    reading: 'だいじょうぶ',
    romaji: 'daijoubu',
    meaning: '没关系、不要紧',
    partOfSpeech: '形容动词 (な形)',
    level: 'N5',
    examTag: '生活高频口语',
    collocation: '大丈夫ですか (不要紧吧)',
    example: { japanese: '心配しないで、大丈夫ですよ。', furigana: 'しんぱいしないで、だいじょうぶですよ。', chinese: '别担心，没关系的。' }
  },
  {
    id: 'n5_17',
    kanji: '綺麗',
    reading: 'きれい',
    romaji: 'kirei',
    meaning: '美丽；干净',
    partOfSpeech: '形容动词 (な形)',
    level: 'N5',
    examTag: '易错假名 (な形非い形)',
    collocation: '綺麗な部屋 (干净漂亮的房间)',
    example: { japanese: '桜がとても綺麗ですね。', furigana: 'さくらがとてもきれいですね。', chinese: '樱花真漂亮呀。' }
  },
  {
    id: 'n5_18',
    kanji: '静か',
    reading: 'しずか',
    romaji: 'shizuka',
    meaning: '安静的、清静的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N5',
    examTag: '连体修饰 (な)',
    collocation: '静かな場所 (安静的地方)',
    example: { japanese: '図書館はとても静かです。', furigana: 'としょかんはとてもしずかです。', chinese: '图书馆非常安静。' }
  },
  {
    id: 'n5_19',
    kanji: 'いつも',
    reading: 'いつも',
    romaji: 'itsumo',
    meaning: '经常、总是',
    partOfSpeech: '副词',
    level: 'N5',
    examTag: '频率副词',
    collocation: 'いつもありがとうございます',
    example: { japanese: '彼はいつも朝７時に起きます。', furigana: 'かれはいつもあさしちじにおきます。', chinese: '他总是早晨7点起床。' }
  },
  {
    id: 'n5_20',
    kanji: 'とても',
    reading: 'とても',
    romaji: 'totemo',
    meaning: '非常、很',
    partOfSpeech: '副词',
    level: 'N5',
    examTag: '程度副词',
    collocation: 'とても面白い (很有趣)',
    example: { japanese: '日本語の勉強はとても面白いです。', furigana: 'にほんごのべんきょうはとてもおもしろいです。', chinese: '日语学习非常有意思。' }
  },

  // =========================================================================
  // ===================== N4 日常进阶实用词汇 (精讲) =======================
  // =========================================================================
  {
    id: 'n4_1',
    kanji: '案内',
    reading: 'あんない',
    romaji: 'annai',
    meaning: '带路、引导、通知',
    partOfSpeech: '名词/サ变动词',
    level: 'N4',
    examTag: '模拟练习高频名词',
    collocation: '道案内 (指路) / 案内状',
    example: { japanese: '東京の街をご案内します。', furigana: 'とうきょうのまちをごあんないします。', chinese: '带您游览东京街头。' }
  },
  {
    id: 'n4_2',
    kanji: '遠慮',
    reading: 'えんりょ',
    romaji: 'enryo',
    meaning: '客气、顾虑、谢绝',
    partOfSpeech: '名词/サ变动词',
    level: 'N4',
    examTag: '日本社交核心文化词',
    collocation: '遠慮なくどうぞ (请别客气)',
    example: { japanese: 'どうぞ遠慮しないで食べてください。', furigana: 'どうぞえんりょしないでたべてください。', chinese: '请别客气尽管吃吧。' }
  },
  {
    id: 'n4_3',
    kanji: '届く',
    reading: 'とどく',
    romaji: 'todoku',
    meaning: '寄到、送达 (自动词)',
    partOfSpeech: '动词一类',
    level: 'N4',
    examTag: '自他动词成对辨析',
    collocation: '荷物が届く (包裹寄到)',
    example: { japanese: '注文した本が今日届きました。', furigana: 'ちゅうもんしたほんがきょうとどきました。', chinese: '订购的书今天送到了。' }
  },
  {
    id: 'n4_4',
    kanji: '届ける',
    reading: 'とどける',
    romaji: 'todokeru',
    meaning: '送去、申报 (他动词)',
    partOfSpeech: '动词二类',
    level: 'N4',
    examTag: '自他对应考点',
    collocation: '書類を届ける (递送文件)',
    example: { japanese: '拾った財布を警察に届けた。', furigana: 'ひろったさいふをけいさつにとどけた。', chinese: '把捡到的钱包交给了警察局。' }
  },
  {
    id: 'n4_5',
    kanji: '準備',
    reading: 'じゅんび',
    romaji: 'junbi',
    meaning: '准备、筹备',
    partOfSpeech: '名词/サ变动词',
    level: 'N4',
    examTag: '考卷高频词',
    collocation: '準備ができる (准备就绪)',
    example: { japanese: '旅行の準備はもう終わりましたか？', furigana: 'りょこうのじゅんびはもうおわりましたか？', chinese: '旅行的准备工作已经做好了吗？' }
  },
  {
    id: 'n4_6',
    kanji: '都合',
    reading: 'つごう',
    romaji: 'tsugou',
    meaning: '情况、方便与否',
    partOfSpeech: '名词',
    level: 'N4',
    examTag: '商务预约核心词',
    collocation: '都合がいい / 都合が悪い',
    example: { japanese: '明日の午後、ご都合はいかがでしょうか？', furigana: 'あすのごご、ごつごうはいかがでしょうか？', chinese: '明天下午您的时间方便吗？' }
  },
  {
    id: 'n4_7',
    kanji: '手伝う',
    reading: 'てつだう',
    romaji: 'tetsudau',
    meaning: '帮忙、协助',
    partOfSpeech: '动词一类',
    level: 'N4',
    examTag: '请求表达 (〜てくれる)',
    collocation: '仕事を手伝う (协助工作)',
    example: { japanese: '引っ越しを手伝ってくれませんか？', furigana: 'ひっこしをてつだってくれませんか？', chinese: '能帮我搬一下家吗？' }
  },
  {
    id: 'n4_8',
    kanji: '急ぐ',
    reading: 'いそぐ',
    romaji: 'isogu',
    meaning: '急忙、赶快',
    partOfSpeech: '动词一类',
    level: 'N4',
    examTag: 'イ音便 (急いで)',
    collocation: '急いで行く (赶着去)',
    example: { japanese: '電車に乗り遅れるから、急ぎましょう！', furigana: 'でんしゃにのりおくれるから、いそぎましょう！', chinese: '要赶不上电车了，咱们快点！' }
  },
  {
    id: 'n4_9',
    kanji: '故障',
    reading: 'こしょう',
    romaji: 'koshou',
    meaning: '故障、出毛病',
    partOfSpeech: '名词/サ变动词',
    level: 'N4',
    examTag: '生活实用问题词',
    collocation: 'エアコンが故障する',
    example: { japanese: 'エレベーターが故障中ですので階段をご利用ください。', furigana: 'エレベーターがこしょうちゅうですのでかいだんをごりようください。', chinese: '电梯故障中，请走楼梯。' }
  },
  {
    id: 'n4_10',
    kanji: '実は',
    reading: 'じつは',
    romaji: 'jitsuwa',
    meaning: '其实、说实话',
    partOfSpeech: '副词/接续词',
    level: 'N4',
    examTag: '听力转折提示词',
    collocation: '実は〜なんです (道出实情)',
    example: { japanese: '実は、来月から転職することになりました。', furigana: 'じつは、らいげつからてんしょくすることになりました。', chinese: '说实话，我定于下个月换工作了。' }
  },
  {
    id: 'n4_11',
    kanji: '必ず',
    reading: 'かならず',
    romaji: 'kanarazu',
    meaning: '必定、务必',
    partOfSpeech: '副词',
    level: 'N4',
    examTag: '副词辨析 (ぜひ/きっと)',
    collocation: '必ず約束を守る',
    example: { japanese: '明日の朝、必ず連絡してください。', furigana: 'あしたのあさ、かならずれんらくしてください。', chinese: '明天早晨务必请和我联系。' }
  },
  {
    id: 'n4_12',
    kanji: '複雑',
    reading: 'ふくざつ',
    romaji: 'fukuzatsu',
    meaning: '复杂的、难懂的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N4',
    examTag: '反义词 (単純)',
    collocation: '複雑な手続き (繁琐手续)',
    example: { japanese: 'この機械の操作は複雑です。', furigana: 'このきかいのそうさはふくざつです。', chinese: '这台机器的操作很复杂。' }
  },

  // =========================================================================
  // ===================== N3 中级核心分水岭词汇 (精讲) =======================
  // =========================================================================
  {
    id: 'n3_1',
    kanji: '解決',
    reading: 'かいけつ',
    romaji: 'kaiketsu',
    meaning: '解决、化解',
    partOfSpeech: '名词/サ变动词',
    level: 'N3',
    examTag: '模拟练习常考搭配',
    collocation: '問題を解決する (化解难题)',
    example: { japanese: 'トラブルを迅速に解決することができました。', furigana: 'トラブルをじんそくにかいけつすることができました。', chinese: '得以迅速化解了纠纷。' }
  },
  {
    id: 'n3_2',
    kanji: '確かめる',
    reading: 'たしかめる',
    romaji: 'tashikameru',
    meaning: '查实、核实、弄清',
    partOfSpeech: '动词二类',
    level: 'N3',
    examTag: '近义词替换考点',
    collocation: '安全を確かめる (确认安全)',
    example: { japanese: '出発前にもう一度チケットの日時を確かめた。', furigana: 'しゅっぱつまえにもういちどチケットのにちじをたしかめた。', chinese: '出发前再次核实了车票的日期与时间。' }
  },
  {
    id: 'n3_3',
    kanji: '協力',
    reading: 'きょうりょく',
    romaji: 'kyouryoku',
    meaning: '协作、合作、配合',
    partOfSpeech: '名词/サ变动词',
    level: 'N3',
    examTag: '敬语搭配 (ご協力)',
    collocation: 'ご協力をお願い申し上げます',
    example: { japanese: 'チーム全員が協力してプロジェクトを成功させた。', furigana: 'チームぜんいんがきょうりょくしてプロジェクトをせいこうさせた。', chinese: '全组人员齐心协力让项目取得了成功。' }
  },
  {
    id: 'n3_4',
    kanji: '普段',
    reading: 'ふだん',
    romaji: 'fudan',
    meaning: '平时、平常',
    partOfSpeech: '名词/副词',
    level: 'N3',
    examTag: '词义辨析 (普通/普段)',
    collocation: '普段着 (便服) / 普段通り',
    example: { japanese: '普段は自炊していますが、忙しい時は外食します。', furigana: 'ふだんはじすいしていますが、いそがしいときはがいしょくします。', chinese: '平时自己做饭，忙的时候在外面吃。' }
  },
  {
    id: 'n3_5',
    kanji: 'うっかり',
    reading: 'うっかり',
    romaji: 'ukkari',
    meaning: '不留神、漫不经心',
    partOfSpeech: '副词',
    level: 'N3',
    examTag: '拟态副词必考',
    collocation: 'うっかり忘れる (一时疏忽忘记)',
    example: { japanese: 'うっかり傘を電車の中に忘れてしまった。', furigana: 'うっかりかさをでんしゃのなかにわすれてしまった。', chinese: '一时大意把雨伞忘在电车里了。' }
  },
  {
    id: 'n3_6',
    kanji: 'ぴったり',
    reading: 'ぴったり',
    romaji: 'pittari',
    meaning: '恰好、吻合、严丝合缝',
    partOfSpeech: '副词/な形',
    level: 'N3',
    examTag: '高频副词',
    collocation: 'サイズがぴったり (尺寸正合适)',
    example: { japanese: 'この靴は私の足にぴったり合っています。', furigana: 'このくつはわたしのあしにぴったりあっています。', chinese: '这双鞋和我的脚型完全吻合。' }
  },
  {
    id: 'n3_7',
    kanji: '関心',
    reading: 'かんしん',
    romaji: 'kanshin',
    meaning: '关心、兴趣',
    partOfSpeech: '名词',
    level: 'N3',
    examTag: '同音异义 (関心/感心)',
    collocation: '〜に関心を持つ (对…感兴趣)',
    example: { japanese: '環境問題に深い関心を持っています。', furigana: 'かんきょうもんだいにふかいかんしんをもっています。', chinese: '对环境保护问题怀有浓厚关切。' }
  },
  {
    id: 'n3_8',
    kanji: '感心',
    reading: 'かんしん',
    romaji: 'kanshin',
    meaning: '钦佩、赞赏',
    partOfSpeech: '名词/サ变/な形',
    level: 'N3',
    examTag: '同音陷阱辨析',
    collocation: '感心する (佩服)',
    example: { japanese: '彼の努力する姿には本当に感心します。', furigana: 'かれのどりょくするすがたにはほんとうにかんしんします。', chinese: '对他刻苦努力的姿态打心底里钦佩。' }
  },
  {
    id: 'n3_9',
    kanji: '効果',
    reading: 'こうか',
    romaji: 'kouka',
    meaning: '效果、成效',
    partOfSpeech: '名词',
    level: 'N3',
    examTag: '搭配考点',
    collocation: '効果が現れる (见效)',
    example: { japanese: 'この薬を飲んだらすぐに効果が出ました。', furigana: 'このくすりをのんだらすぐにこうかがでました。', chinese: '吃了这药马上就见效了。' }
  },
  {
    id: 'n3_10',
    kanji: '満足',
    reading: 'まんぞく',
    romaji: 'manzoku',
    meaning: '满意、知足',
    partOfSpeech: '名词/サ变/な形',
    level: 'N3',
    examTag: '反义词 (不満)',
    collocation: '結果に満足する (对结果满意)',
    example: { japanese: '試験の結果には大いに満足しています。', furigana: 'しけんのけっかにはおおいにまんぞくしています。', chinese: '对这次考试的成绩非常满意。' }
  },

  // =========================================================================
  // ===================== N2 职场实战与中高级核心词汇 (精讲) =================
  // =========================================================================
  {
    id: 'n2_1',
    kanji: '曖昧',
    reading: 'あいまい',
    romaji: 'aimai',
    meaning: '含糊、模棱两可、不明确',
    partOfSpeech: '形容动词 (な形)',
    level: 'N2',
    examTag: '分级练习必考读音',
    collocation: '曖昧な返事 (含糊其辞的答复)',
    example: { japanese: '曖昧な返答は相手の誤解を招く恐れがあります。', furigana: 'あいまいなへんとうはあいてのごかいをまねくおそれがあります。', chinese: '模棱两可的回答恐将招致对方误解。' }
  },
  {
    id: 'n2_2',
    kanji: '契機',
    reading: 'けいき',
    romaji: 'keiki',
    meaning: '契机、转机、转折点',
    partOfSpeech: '名词',
    level: 'N2',
    examTag: '语法考点 (〜を契機に)',
    collocation: '〜を契機として (以…为契机)',
    example: { japanese: '日本への留学を契機に、人生の価値観が大きく変わった。', furigana: 'にほんへのりゅうがくをけいきに、じんせいのかちかんがおおきくかわった。', chinese: '以赴日留学为契机，人生价值观发生了重大转变。' }
  },
  {
    id: 'n2_3',
    kanji: '配慮',
    reading: 'はいりょ',
    romaji: 'hairyo',
    meaning: '关照、体贴、顾及',
    partOfSpeech: '名词/サ变动词',
    level: 'N2',
    examTag: '商务敬语经典',
    collocation: '細やかな配慮 (无微不至的关照)',
    example: { japanese: 'お客様のプライバシーに配慮した対応が求められます。', furigana: 'おきゃくさまのプライバシーにはいりょしたたいおうがもとめられます。', chinese: '要求在应对服务中充分顾及顾客的隐私权。' }
  },
  {
    id: 'n2_4',
    kanji: '柔軟',
    reading: 'じゅうなん',
    romaji: 'juunan',
    meaning: '灵活的、柔韧的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N2',
    examTag: '近义词 (フレキシブル)',
    collocation: '柔軟な姿勢 / 柔軟に対応する',
    example: { japanese: '状況の変化に応じて柔軟に対応してください。', furigana: 'じょうきょうのへんかにおうじてじゅうなんにたいおうしてください。', chinese: '请根据局势变化进行灵活变通应对。' }
  },
  {
    id: 'n2_5',
    kanji: '縮小',
    reading: 'しゅくしょう',
    romaji: 'shukushou',
    meaning: '缩小、缩减',
    partOfSpeech: '名词/サ变动词',
    level: 'N2',
    examTag: '模拟练习汉字题常客',
    collocation: '規模を縮小する (压缩规模)',
    example: { japanese: '赤字部門の規模を縮小せざるを得ない。', furigana: 'あかじぶもんのきぼをしゅくしょうせざるをえない。', chinese: '不得不对亏损部门进行规模缩减。' }
  },
  {
    id: 'n2_6',
    kanji: '妥協',
    reading: 'だきょう',
    romaji: 'dakyou',
    meaning: '妥协、让步',
    partOfSpeech: '名词/サ变动词',
    level: 'N2',
    examTag: '商务谈判考点',
    collocation: '妥協案 (折中方案) / 妥協を許さない',
    example: { japanese: '品質に関しては一切の妥協を許さない。', furigana: 'ひんしつにかんしてはいっさいのだきょうをゆるさない。', chinese: '对于产品品质绝不容许丝毫妥协。' }
  },
  {
    id: 'n2_7',
    kanji: '率直',
    reading: 'そっちょく',
    romaji: 'sotchoku',
    meaning: '坦率、直率',
    partOfSpeech: '形容动词 (な形)',
    level: 'N2',
    examTag: '促音发音辨析',
    collocation: '率直な意見 (坦率的意见)',
    example: { japanese: 'この件について率直なご意見をお聞かせ願えますか。', furigana: 'このけんについてそっちょくなごいけんをおきかせねがえますか。', chinese: '关于此事能否听听您坦诚直率的高见？' }
  },
  {
    id: 'n2_8',
    kanji: '深刻',
    reading: 'しんこく',
    romaji: 'shinkoku',
    meaning: '严重的、严峻的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N2',
    examTag: '词义搭配',
    collocation: '深刻な問題 (严峻问题)',
    example: { japanese: '少子高齢化は極めて深刻な社会課題である。', furigana: 'しょうしこうれいかはきわめてしんこくなしゃかいかだいである。', chinese: '少子老龄化是极度严峻的社会课题。' }
  },
  {
    id: 'n2_9',
    kanji: '視野',
    reading: 'しや',
    romaji: 'shiya',
    meaning: '视野、眼界',
    partOfSpeech: '名词',
    level: 'N2',
    examTag: '高分惯用搭配',
    collocation: '視野を広げる (开阔眼界)',
    example: { japanese: '読書を通じて世界への視野を広げることができた。', furigana: 'どくしょをつうじてせかいへのしやをひろげることができた。', chinese: '通过阅读开拓了通向全世界的视野。' }
  },
  {
    id: 'n2_10',
    kanji: '手薄',
    reading: 'てうす',
    romaji: 'teusu',
    meaning: '人手不足、力量单薄',
    partOfSpeech: '形容动词 (な形)',
    level: 'N2',
    examTag: '特殊训读组合',
    collocation: '警備が手薄になる (戒备松懈)',
    example: { japanese: '休日のためスタッフの配置が手薄になっております。', furigana: 'きゅうじつのためスタッフのはいちがてうすになっております。', chinese: '因为是假日，员工配置较少。' }
  },

  // =========================================================================
  // ===================== N1 高阶学术、政经与地道典雅词汇 (精讲) =============
  // =========================================================================
  {
    id: 'n1_1',
    kanji: '画期的',
    reading: 'かっきてき',
    romaji: 'kakkiteki',
    meaning: '划时代的、具有划时代意义的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N1',
    examTag: 'N1经典高频词',
    collocation: '画期的な新技術 (划时代新技术)',
    example: { japanese: 'このAI技術は創薬分野において画期的な成果をもたらした。', furigana: 'このAIぎじゅつはそうやくぶんやにおいてかっきてきなせいかをもたらした。', chinese: '该项AI技术在医药研发领域带来了划时代的研究成果。' }
  },
  {
    id: 'n1_2',
    kanji: '是正',
    reading: 'ぜせい',
    romaji: 'zesei',
    meaning: '纠正、修正、纠偏',
    partOfSpeech: '名词/サ变动词',
    level: 'N1',
    examTag: '模拟练习高频学术名词',
    collocation: '格差を是正する (纠正贫富差距)',
    example: { japanese: '不合理な格差を早急に是正するための制度改革に着手した。', furigana: 'ふごうりなかくさをそうきゅうにぜせいするためのせいどかいかくにちゃくしゅした。', chinese: '着手推进制度改革以迅速纠正不合理的差距。' }
  },
  {
    id: 'n1_3',
    kanji: '緻密',
    reading: 'ちみつ',
    romaji: 'chimitsu',
    meaning: '缜密的、精密的、严密的',
    partOfSpeech: '形容动词 (な形)',
    level: 'N1',
    examTag: '近义词替换 (精巧/周到)',
    collocation: '緻密な計画 (周密周详的计划)',
    example: { japanese: '緻密な市場分析に基づき、新たな海外戦略を打ち出した。', furigana: 'ちみつなしじょうぶんせきにもとづき、あらたなかいがいせんりゃくをうちだした。', chinese: '基于缜密的市场行情分析，出台了崭新的出海战略。' }
  },
  {
    id: 'n1_4',
    kanji: '目覚ましい',
    reading: 'めざましい',
    romaji: 'mezamashii',
    meaning: '惊人的、显著的、卓越的',
    partOfSpeech: '形容词 (い形)',
    level: 'N1',
    examTag: '模拟练习形容词必考',
    collocation: '目覚ましい発展を遂げる',
    example: { japanese: '近年の人工知能の進化には目覚ましいものがある。', furigana: 'きんねんのじんこうちのうのしんかにはめざましいものがある。', chinese: '近年来人工智能的突飞猛进着实令人瞩目惊叹。' }
  },
  {
    id: 'n1_5',
    kanji: '免除',
    reading: 'めんじょ',
    romaji: 'menjo',
    meaning: '免除、豁免',
    partOfSpeech: '名词/サ变动词',
    level: 'N1',
    examTag: '官方手续高频词',
    collocation: '学費が免除される (豁免学费)',
    example: { japanese: '優秀な成績を収めた学生には授業料が全額免除される。', furigana: 'ゆうしゅうなせいせきをおさめたがくせいにはじゅぎょうりょうがぜんがくめんじょされる。', chinese: '取得优异学业成绩的学生将被全额免除学费。' }
  },
  {
    id: 'n1_6',
    kanji: '端緒',
    reading: 'たんしょ',
    romaji: 'tansho',
    meaning: '端绪、由头、开端',
    partOfSpeech: '名词',
    level: 'N1',
    examTag: '特殊音读超难考点',
    collocation: '解決の端緒を開く (打开解决之门)',
    example: { japanese: '両首脳の会談は和平交渉の端緒を開く契機となった。', furigana: 'りょうしゅのうのかいだんはわへいこうしょうのたんしょをひらくけいきとなった。', chinese: '两国领导人的会晤成为了开启和平谈判端绪的历史契机。' }
  },
  {
    id: 'n1_7',
    kanji: '凌駕',
    reading: 'りょうが',
    romaji: 'ryouga',
    meaning: '凌驾、超越、超越前人',
    partOfSpeech: '名词/サ变动词',
    level: 'N1',
    examTag: '高难读音与同义词',
    collocation: '他を凌駕する (超群绝伦)',
    example: { japanese: '新製品の処理性能は従来機種を遥かに凌駕している。', furigana: 'しんせいひんのしょりせいのうはじゅうらいきしゅをはるかにりょうがしている。', chinese: '新产品的运算吞吐性能远远凌驾超越了传统机型。' }
  },
  {
    id: 'n1_8',
    kanji: '遺憾',
    reading: 'いかん',
    romaji: 'ikan',
    meaning: '遗憾、可惜 (官方正式用语)',
    partOfSpeech: '名词/な形',
    level: 'N1',
    examTag: '外交政治必考词',
    collocation: '極めて遺憾である (极其遗憾)',
    example: { japanese: '今回の不祥事につきましては、極めて遺憾に存じております。', furigana: 'こんかいのふしょうじにつきましては、きわめていかんにぞんじております。', chinese: '对于本次出现的不当事端，深表至极的遗憾。' }
  },
  {
    id: 'n1_9',
    kanji: '網羅',
    reading: 'もうら',
    romaji: 'moura',
    meaning: '囊括、网罗、包罗万象',
    partOfSpeech: '名词/サ变动词',
    level: 'N1',
    examTag: '出版学术评测常客',
    collocation: '要点を網羅する (囊括要点)',
    example: { japanese: '本書は日本語文法の全容を完璧に網羅した最高峰の専門書だ。', furigana: 'ほんしょはにほんごぶんぽうのぜんようをかんぺきにもうらしたさいこうほうのせんもんしょだ。', chinese: '本书是完备囊括了日语语法全貌的最高水平专业典籍。' }
  },
  {
    id: 'n1_10',
    kanji: '躊躇',
    reading: 'ちゅうちょ',
    romaji: 'chuucho',
    meaning: '踌躇、犹豫不决',
    partOfSpeech: '名词/サ变动词',
    level: 'N1',
    examTag: '模拟练习近义词 (ためらい)',
    collocation: '躊躇なく決断する (毫不犹豫地下决断)',
    example: { japanese: '好機を逃さぬよう、躊躇することなく迅速に行動を起こした。', furigana: 'こうきをのがさぬよう、ちゅうちょすることなくじんそくにこうどうをおこした。', chinese: '为不错失良机，毫不犹豫地迅速采取了行动。' }
  }
]

// 原有词条优先并保留 ID，升级后旧学习记录仍可对应。开放词库按表记+读音去重。
const wordKey = (word: Pick<VocabItem, 'kanji' | 'reading'>) => `${word.kanji.normalize('NFKC')}\u0000${word.reading.normalize('NFKC')}`
const seenWords = new Set(ORIGINAL_VOCAB.map(wordKey))
const expandedWords = (importedVocabulary as VocabItem[]).filter(word => {
  const key = wordKey(word)
  if (seenWords.has(key)) return false
  seenWords.add(key)
  return true
}).map(word => ({ ...word, romaji: kanaToRomaji(word.reading) }))
export const COMPREHENSIVE_VOCAB: VocabItem[] = [...ORIGINAL_VOCAB, ...expandedWords]
