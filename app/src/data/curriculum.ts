import { EXTRA_CHAPTERS } from './extraCurriculum'

export interface GrammarPoint {
  id: string
  pattern: string
  meaning: string
  connection: string // 接续方式
  aiExplanation: string // 预先编写的语法讲解（非实时生成）
  exampleSentence: {
    japanese: string
    furigana: string
    chinese: string
  }
  extraExamples?: { japanese: string; furigana: string; chinese: string }[]
}

export interface CourseChapter {
  id: string
  chapterNum: number
  title: string
  desc: string
  grammars: GrammarPoint[]
}

export interface LevelCurriculum {
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
  title: string
  badge: string
  levelDesc: string
  vocabTarget: number // 学习参考目标，不代表本应用收录数量
  grammarTarget: number // 学习参考目标，不代表本应用收录数量
  estimatedHours: number
  colorTheme: string
  chapters: CourseChapter[]
}

const BASE_CURRICULUM: LevelCurriculum[] = [
  // ==================== N5 基础生存 ====================
  {
    level: 'N5',
    title: 'N5 基础生存与日常入门',
    badge: '入门基石',
    levelDesc: '通过精选语法练习介绍身份、否定判断、动作对象与场所、存在和愿望表达。',
    vocabTarget: 800,
    grammarTarget: 45,
    estimatedHours: 40,
    colorTheme: 'from-emerald-500 to-teal-600',
    chapters: [
      {
        id: 'n5_c1',
        chapterNum: 1,
        title: '问候与主谓句结构 (〜は〜です)',
        desc: '学习用话题和名词判断句介绍身份；日语谓语通常位于句末，这是常见语序，不是倒装。',
        grammars: [
          {
            id: 'g_n5_1',
            pattern: 'A は B です',
            meaning: 'A 是 B',
            connection: '名词 + は + 名词 + です',
            aiExplanation: '【语法说明】助词「は」在这里读作 wa，提示句子讨论的话题；名词后接「です」作礼貌的判断。在本句型中可理解为“A 是 B”，不需要在身份名词后加「を」。',
            exampleSentence: {
              japanese: '私は学生です。',
              furigana: 'わたしはがくせいです。',
              chinese: '我是学生。'
            }
          },
          {
            id: 'g_n5_2',
            pattern: 'A は B ではありません',
            meaning: 'A 不是 B (否定句)',
            connection: '名词 + は + 名词 + ではありません / じゃありません',
            aiExplanation: '【语法说明】「ではありません」是「です」的正式否定形，口语中常把「では」缩读为「じゃ」，变成更加日常随和的「じゃありません」。',
            exampleSentence: {
              japanese: '田中さんは先生ではありません。',
              furigana: 'たなかさんはせんせいではありません。',
              chinese: '田中先生不是老师。'
            }
          }
        ]
      },
      {
        id: 'n5_c2',
        chapterNum: 2,
        title: '动作与场所助词 (〜を〜ます / 〜で〜ます)',
        desc: '学会表达“在哪里做什么事情”，解锁动词日常敬体ます形。',
        grammars: [
          {
            id: 'g_n5_3',
            pattern: '名词 + を + 他动词',
            meaning: '表示动作直接作用的对象 (宾格)',
            connection: '宾语名词 + を (读作 o) + 动词',
            aiExplanation: '【语法说明】本课的「を」标示吃、喝、买等动作直接作用的对象，读作 o。「を」也有表示离开起点、经过地点等用法，不能把所有「を」都当作动作对象。',
            exampleSentence: {
              japanese: 'ご飯を食べます。',
              furigana: 'ごはんをたべます。',
              chinese: '吃饭。'
            }
          },
          {
            id: 'g_n5_4',
            pattern: '场所名词 + で + 动作动词',
            meaning: '表示动作发生的场所/地点',
            connection: '场所名词 + で + 动词',
            aiExplanation: '【语法说明】本课的「で」标示学习、阅读等动作发生的场所。人或物的存在地点通常用「に」；活动举行的场所也可用「で」，所以要结合句意判断，不能只看某一个动词。',
            exampleSentence: {
              japanese: '図書館で本を読みます。',
              furigana: 'としょかんでほんをよみます。',
              chinese: '在图书馆看书。'
            }
          }
        ]
      },
      {
        id: 'n5_c3',
        chapterNum: 3,
        title: '存在与愿望 (〜があります/います / 〜たいです)',
        desc: '介绍某处有什么，并用动词ます形去掉ます后接たいです表达自己的愿望。',
        grammars: [
          {
            id: 'g_n5_5',
            pattern: '场所 + に + 物/人 + が + あります/います',
            meaning: '在某处有某物/人',
            connection: '场所 + に + 物/人 + が + あります(物品、植物等)/います(人、动物等)',
            aiExplanation: '【语法说明】一般介绍人或动物的存在用「います」，物品、建筑和植物用「あります」。植物有生命，不能把区别简单说成“有无生命”。本句型用「に」标示存在地点，用「が」引出要介绍的人或物。',
            exampleSentence: {
              japanese: '机の上に本があります。庭に犬がいます。',
              furigana: 'つくえのうえにほんがあります。にわにいぬがいます。',
              chinese: '桌上有书。院子里有小狗。'
            }
          },
          {
            id: 'g_n5_6',
            pattern: '动词ます连用形 + たいです',
            meaning: '想做某事 (本课练习自己的愿望)',
            connection: '动词连用形(去ます) + たいです',
            aiExplanation: '【语法说明】动词ます形去掉ます后接「たいです」，表达想做某事。「たい」按い形容词方式变化；本课先练自己的愿望，也可在合适语境中用「〜たいですか」询问对方的愿望，不直接替他人断言内心想法。',
            exampleSentence: {
              japanese: '日本へ旅行に行きたいです。',
              furigana: 'にほんへりょこうにいきたいです。',
              chinese: '我想去日本旅游。'
            }
          }
        ]
      }
    ]
  },

  // ==================== N4 日常进阶 ====================
  {
    level: 'N4',
    title: 'N4 动词大变形与生活交流',
    badge: '进阶跃迁',
    levelDesc: '学习请求、持续状态、经历、能力与授受等精选句型；系统课程仍在逐步扩充。',
    vocabTarget: 1500,
    grammarTarget: 75,
    estimatedHours: 80,
    colorTheme: 'from-blue-500 to-indigo-600',
    chapters: [
      {
        id: 'n4_c1',
        chapterNum: 1,
        title: '动词连接法：て形与连续动作',
        desc: '日语中最关键的变形桥梁，掌握请求、正在进行与原因顺承。',
        grammars: [
          {
            id: 'g_n4_1',
            pattern: '〜てください',
            meaning: '请做某事 (委婉请求)',
            connection: '动词て形 + ください',
            aiExplanation: '【语法说明】动词变成「て形」就像在两截车厢间挂上了钩子，表示动作未完待续。「ください」本意是请给予我恩惠，合起来就是礼貌恳请对方做动作。',
            exampleSentence: {
              japanese: 'ここに名前を書いてください。',
              furigana: 'ここになまえをかいてください。',
              chinese: '请在这里写下名字。'
            }
          },
          {
            id: 'g_n4_2',
            pattern: '〜ています',
            meaning: '正在进行 / 状态持续',
            connection: '动词て形 + います',
            aiExplanation: '【语法说明】若接持续性动词(如食べている)表示当前动作正在进行；若接瞬间性动词(如結婚している、知っている)则表示动作发生后留下的状态持续。',
            exampleSentence: {
              japanese: '今、日本語を勉強しています。',
              furigana: 'いま、にほんごをべんきょうしています。',
              chinese: '现在正在学习日语。'
            }
          }
        ]
      },
      {
        id: 'n4_c2',
        chapterNum: 2,
        title: '经历与能力 (〜たことがある / 〜ことができる)',
        desc: '表达人生经历与自身技能，解锁动词简体的辞书形与た形。',
        grammars: [
          {
            id: 'g_n4_3',
            pattern: '〜たことがあります',
            meaning: '曾经做过某事 (人生经历)',
            connection: '动词た形(过去式) + ことがあります',
            aiExplanation: '【语法说明】动词た形表示过去发生，「こと」将动作名词化变成一件事情，「あります」表示拥有此项经历。',
            exampleSentence: {
              japanese: '富士山に登ったことがあります。',
              furigana: 'ふじさんにのぼったことがあります。',
              chinese: '我曾经登过富士山。'
            }
          },
          {
            id: 'g_n4_4',
            pattern: '〜ことができます',
            meaning: '能够、可以做某事 (能力或许可)',
            connection: '动词辞书形(基本形) + ことができます',
            aiExplanation: '【语法说明】用形式名词「こと」包装动词形成一件具体的事情，再加上「ができます」表示具备做该事的能力或客观条件具备。',
            exampleSentence: {
              japanese: '私はピアノを弾くことができます。',
              furigana: 'わたしはピアノをひくことができます。',
              chinese: '我会弹钢琴。'
            }
          }
        ]
      },
      {
        id: 'n4_c3',
        chapterNum: 3,
        title: '义务与授受动词 (〜なければならない / 〜てあげる/くれる/もらう)',
        desc: '攻克日语中独特的“人情往来”授受系统与必须执行的规则。',
        grammars: [
          {
            id: 'g_n4_5',
            pattern: '〜なければなりません',
            meaning: '必须做某事 (不可不做)',
            connection: '动词ない形(去い) + ければなりません',
            aiExplanation: '【语法说明】字面直译为“如果不做的话就成何体统/不行”，双重否定表强烈的客观义务或规定。',
            exampleSentence: {
              japanese: '明日までに宿題を出さなければなりません。',
              furigana: 'あしたまでにしゅくだいをださなければなりません。',
              chinese: '明天之前必须交作业。'
            }
          },
          {
            id: 'g_n4_6',
            pattern: '〜てくれます / 〜てもらいます',
            meaning: '别人为我方做某事 / 我方得到别人做某事的帮助',
            connection: '动词て形 + くれます/もらいます',
            aiExplanation: '【语法说明】「人が〜てくれる」从对方为我方做事的角度描述帮助；「私は人に〜てもらう」从我方接受帮助的角度描述。是否主动请求要看上下文，不能仅凭这两个形式判断。',
            exampleSentence: {
              japanese: '先生が日本語を教えてくれました。',
              furigana: 'せんせいがにほんごをおしえてくれました。',
              chinese: '老师为我教了日语。'
            }
          }
        ]
      }
    ]
  },

  // ==================== N3 中级核心 ====================
  {
    level: 'N3',
    title: 'N3 中级门槛与逻辑表达',
    badge: '中级分水岭',
    levelDesc: '练习限定、计划、时间范围与转折等精选句型；系统课程仍在逐步扩充。',
    vocabTarget: 3000,
    grammarTarget: 110,
    estimatedHours: 120,
    colorTheme: 'from-violet-500 to-purple-600',
    chapters: [
      {
        id: 'n3_c1',
        chapterNum: 1,
        title: '情理与道德约束 (〜わけにはいかない)',
        desc: '中级最核心情态助动词之一，表达受到社会道德或客观常理压制的情绪。',
        grammars: [
          {
            id: 'g_n3_1',
            pattern: '〜わけにはいかない',
            meaning: '不能、绝不能 (受常理或道德约束)',
            connection: '动词辞书形 + わけにはいかない',
            aiExplanation: '【语法说明】「わけ」是道理、情理。合起来表示即使主观上想做，但碍于常识、社会规则、人情面子在情理上绝说不过去。',
            exampleSentence: {
              japanese: '大事な約束があるから、仕事を休むわけにはいかない。',
              furigana: 'だいじなやくそくがあるから、しごとをやすむわけにはいかない。',
              chinese: '因为有要紧的约定，所以于情于理绝不能请假不上班。'
            }
          },
          {
            id: 'g_n3_2',
            pattern: '〜うちに',
            meaning: '趁着…期间 (抓住变化前的时间窗口)',
            connection: '动词辞书形/ない形/ている形、い形容词 + うちに；な形容词 + なうちに；名词 + のうちに',
            aiExplanation: '【语法说明】在某种状态尚未发生根本性改变之前，赶紧抓紧时机采取行动，否则错过了窗口期。',
            exampleSentence: {
              japanese: 'スープが温かいうちに召し上がってください。',
              furigana: 'スープがあたたかいうちにめしあがってください。',
              chinese: '趁着汤还热乎请快点喝吧。'
            }
          }
        ]
      },
      {
        id: 'n3_c2',
        chapterNum: 2,
        title: '预期反差与客观规章 (〜わりに(は) / 〜ことになっている)',
        desc: '表达不合常理的反差感，以及组织既定的规章制度。',
        grammars: [
          {
            id: 'g_n3_3',
            pattern: '〜わりに(は)',
            meaning: '虽然…但是却出乎意料地 (超出常态比例)',
            connection: '名+の / 动词简体 / 形容词 + わりに(は)',
            aiExplanation: '【语法说明】「割（わり）」在日语中是比例、成数之意。「わりに」表示从前提条件推算出来的预期，与实际结果不成合理比例。',
            exampleSentence: {
              japanese: '彼は年のわりには若く見える。',
              furigana: 'かれはとしのわりにはわかくみえる。',
              chinese: '按他的年龄来对比，看起来出奇地年轻。'
            }
          },
          {
            id: 'g_n3_4',
            pattern: '〜ことになっている',
            meaning: '规定为…、按规矩… (客观规则)',
            connection: '动词辞书形 / 动词ない形 + ことになっている',
            aiExplanation: '【语法说明】表示不论个人意志如何，组织、校规或法律已经既定形成了客观制度。',
            exampleSentence: {
              japanese: 'このビルではタバコを吸ってはいけないことになっている。',
              furigana: 'このビルではタバコをすってはいけないことになっている。',
              chinese: '这座大厦明文规定严禁吸烟。'
            }
          }
        ]
      },
      {
        id: 'n3_c3',
        chapterNum: 3,
        title: '担忧隐患与巧合偏见 (〜恐れがある / 〜にかぎって)',
        desc: '高级新闻通报中高频出现的负面倾向预测。',
        grammars: [
          {
            id: 'g_n3_5',
            pattern: '〜恐れがある (おそれがある)',
            meaning: '恐怕有…危险/可能 (多用于负面严重后果)',
            connection: '动词辞书形 / 名词+の + 恐れがある',
            aiExplanation: '【语法说明】书面语与新闻气象播报经典句型，专用于警告可能发生令人担忧的恶劣后果。',
            exampleSentence: {
              japanese: '大雨で川が氾濫する恐れがある。',
              furigana: 'おおあめでかわがはんらんするおそれがある。',
              chinese: '大雨恐怕有导致河水决堤泛滥的危险。'
            }
          },
          {
            id: 'g_n3_6',
            pattern: '〜にかぎって',
            meaning: '偏偏在…的时候 (倒霉巧合)',
            connection: '名词 + にかぎって',
            aiExplanation: '【语法说明】带有说话人极强的埋怨、悔恨情绪。表示平时都不这样，偏偏赶在特定时刻撞上倒霉事。',
            exampleSentence: {
              japanese: '傘を持っていない日にかぎって雨が降る。',
              furigana: 'かさをもっていないひにかぎってあめがふる。',
              chinese: '偏偏没带伞的日子就下起雨来。'
            }
          }
        ]
      }
    ]
  },

  // ==================== N2 高级实战 ====================
  {
    level: 'N2',
    title: 'N2 高级实战与原版商务',
    badge: '高级运用',
    levelDesc: '练习变化、原因、限定与书面表达等精选句型；系统课程仍在逐步扩充。',
    vocabTarget: 6000,
    grammarTarget: 170,
    estimatedHours: 180,
    colorTheme: 'from-amber-500 to-orange-600',
    chapters: [
      {
        id: 'n2_c1',
        chapterNum: 1,
        title: '比例伴随演变 (〜につれて / 〜にしたがって)',
        desc: '表达伴随一个因变量的动态推进，自变量也产生同向或异向演变。',
        grammars: [
          {
            id: 'g_n2_1',
            pattern: '〜につれて',
            meaning: '随着…，另一状态也逐渐变化',
            connection: '动词辞书形 / 名词(动作性) + につれて',
            aiExplanation: '【语法说明】表示两种变化相伴发生，前项通常是表示变化的动词或名词，如増える、成長。重点是变化之间的关联，并不要求变化不可逆。',
            exampleSentence: {
              japanese: '年を取るにつれて、健康のありがたみが身にしみる。',
              furigana: 'としをとるにつれて、けんこうのありがたみがみにしみる。',
              chinese: '随着年岁渐长，越发深切体会到健康的可贵。'
            }
          },
          {
            id: 'g_n2_2',
            pattern: '〜にほかならない',
            meaning: '无非是…、正是… (断定唯一本质)',
            connection: '名词 / 动词简体+から + にほかならない',
            aiExplanation: '【语法说明】极其坚决的结论性论述。否定了其他一切外在表象，一针见血地指出根本实质。',
            exampleSentence: {
              japanese: '今回の成功はチーム全員の絶え間ない努力の結果にほかならない。',
              furigana: 'こんかいのせいこうはチームぜんいんのたえまないどりょくのけっかにほかならない。',
              chinese: '这次的成功，无非是全队成员坚持不懈奋斗的必然成果。'
            }
          }
        ]
      },
      {
        id: 'n2_c2',
        chapterNum: 2,
        title: '无奈决断与转机契机 (〜ざるを得ない / 〜を契機に)',
        desc: '商务与评论性文章高频句型，表达不得不做的裁定。',
        grammars: [
          {
            id: 'g_n2_3',
            pattern: '〜ざるを得ない (ざるをえない)',
            meaning: '不得不…、只能… (违背意愿的被迫决断)',
            connection: '动词未然形(ない形去ない) + ざるを得ない (する变为 せざるを得ない)',
            aiExplanation: '【语法说明】古典否定接尾辞「ざる」加上「を得ない」(无法得到其他出路)。表示即便内心万般不愿，迫于严酷现实也不得不这么做。',
            exampleSentence: {
              japanese: '原料費の高騰により、価格を改定せざるを得ない。',
              furigana: 'げんりょうひのこうとうにより、かかくをかいていせざるをえない。',
              chinese: '受原材料成本暴涨影响，不得不调整销售价格。'
            }
          },
          {
            id: 'g_n2_4',
            pattern: '〜を契機に / 〜を契機として',
            meaning: '以…为契机/转折点',
            connection: '名词 + を契機に / を契機として',
            aiExplanation: '【语法说明】「契機（けいき）」指引发剧烈新发展的齿轮启动点。常用于个人人生转变或企业宏观战略转型。',
            exampleSentence: {
              japanese: '病気を契機に、生活習慣を根本から見直した。',
              furigana: 'びょうきをけいきに、せいかつしゅうかんをこんぽんからみなおした。',
              chinese: '以生病为契机，从根本上彻底反省重塑了生活习惯。'
            }
          }
        ]
      },
      {
        id: 'n2_c3',
        chapterNum: 3,
        title: '限制仅限与心理矛盾 (〜にすぎない / 〜つつ(も))',
        desc: '精确限定程度范围，以及思想意识与行为的并存矛盾。',
        grammars: [
          {
            id: 'g_n2_5',
            pattern: '〜にすぎない',
            meaning: '不过是…、只不过是…',
            connection: '名词 / 动词普通体 + にすぎない',
            aiExplanation: '【语法说明】「過ぎない」字面是不超过。用于压低说话人对某事严重性或成就的评估，表示没有超出这层微不足道的限度。',
            exampleSentence: {
              japanese: 'これはまだ第一歩にすぎず、本当の挑戦はこれからだ。',
              furigana: 'これはまだだいいっぽにすぎず、ほんとうのちょうせんはこれからだ。',
              chinese: '这只不过是刚刚迈出的第一步，真正的考验还在后头。'
            }
          },
          {
            id: 'g_n2_6',
            pattern: '动词连用形 + つつ(も)',
            meaning: '一边…却一边… / 明明心里清楚却…',
            connection: '动词ます形(去ます) + つつ(も)',
            aiExplanation: '【语法说明】带有内疚或无可奈何的转折逆接。心里明明十分清楚不该这么做，现实中动作却依然背道而驰。',
            exampleSentence: {
              japanese: '体に悪いと知りつつも、夜食をやめられない。',
              furigana: 'からだにわるいとしりつつも、やしょくをやめられない。',
              chinese: '明明心里清楚对身体有害，却怎么也戒不掉宵夜。'
            }
          }
        ]
      }
    ]
  },

  // ==================== N1 母语精通 ====================
  {
    level: 'N1',
    title: 'N1 登峰造极与学术政经',
    badge: '大师精通',
    levelDesc: '练习正式书面语、限定、让步等精选句型；系统课程仍在逐步扩充。',
    vocabTarget: 10000,
    grammarTarget: 220,
    estimatedHours: 260,
    colorTheme: 'from-rose-600 to-pink-700',
    chapters: [
      {
        id: 'n1_c1',
        chapterNum: 1,
        title: '极端评价与不可抗力 (〜極まりない / 〜を余儀なくされる)',
        desc: '最高端评论修辞，用于学术论文与社评中严厉的定性评价。',
        grammars: [
          {
            id: 'g_n1_1',
            pattern: '〜極まりない (きわまりない) / 〜極まる',
            meaning: '极其…、绝顶… (达到无可附加的极限)',
            connection: '形容动词词干 + 極まりない / 極まる',
            aiExplanation: '【语法说明】源于文语「極まる」。表达某种负面感情、态度或状态达到了登峰造极、无以复加的顶点。',
            exampleSentence: {
              japanese: '公の場でのあのような無責任な発言は、失礼極まりない。',
              furigana: 'おおやけのばでのあのようなむせきにんなはつげんは、しつれいきわまりない。',
              chinese: '在公众场合发表如此不负责任的言论，简直无礼傲慢到了极点。'
            }
          },
          {
            id: 'g_n1_2',
            pattern: '〜を余儀なくされる (をよぎなくされる)',
            meaning: '被迫不得不… (在宏观不可抗力下别无选择)',
            connection: '名词 + を余儀なくされる / を余儀なくさせる',
            aiExplanation: '【语法说明】「名词＋を余儀なくされる」表示受外部条件影响，被迫做出选择或改变。它是较正式的被动表达，不必限于战争或天灾，也不等同于动词的使役被动形式。',
            exampleSentence: {
              japanese: '台風の直撃を受け、イベントは中止を余儀なくされた。',
              furigana: 'たいふうのちょくげきをうけ、イベントはちゅうしをよぎなくされた。',
              chinese: '遭遇台风正面袭击，活动被迫无奈取消。'
            }
          }
        ]
      },
      {
        id: 'n1_c2',
        chapterNum: 2,
        title: '范围穷尽与必然触发 (〜に至るまで / 〜ずにはおかない)',
        desc: '极其考究的文雅书面语，表达范围的极尽以及绝对引发的宿命感。',
        grammars: [
          {
            id: 'g_n1_3',
            pattern: '〜に至るまで (にいたるまで)',
            meaning: '甚至连…都、乃至… (范围巨细靡遗)',
            connection: '名词 + に至るまで',
            aiExplanation: '【语法说明】把范围一直扩展到最细枝末节、甚至常人根本意想不到的极端细微角落，突出调查或涉及面的深度与全面。',
            exampleSentence: {
              japanese: '服装から所持品に至るまで、徹底した検査が行われた。',
              furigana: 'ふくそうからしょじひんにいたるまで、てっていしたけんさがおこなわれた。',
              chinese: '从衣着乃至随身携带的每件微小物品，都接受了彻底严密的搜查。'
            }
          },
          {
            id: 'g_n1_4',
            pattern: '〜ずにはおかない',
            meaning: '必定会使之…、必然造成… (强烈的宿命感与意志)',
            connection: '动词未然形 + ずにはおかない (する变为 せずにはおかない)',
            aiExplanation: '【语法说明】双重否定表超强肯定。「おかない」本意是放置不管。合起来表示自然法则或强大情感冲击，绝不会轻易放过任何一个人。',
            exampleSentence: {
              japanese: '彼の魂のこもった熱演は、観客を感動させずにはおかなかった。',
              furigana: 'かれのたましいのこもったねつえんは、かんきゃくをかんどうさせずにはおかなかった。',
              chinese: '他倾注灵魂的倾情热演，无可抗拒地震撼感动了在场的每一位观众。'
            }
          }
        ]
      },
      {
        id: 'n1_c3',
        chapterNum: 3,
        title: '严苛让步与无差别对待 (〜といえども / 〜であれ〜であれ)',
        desc: '法律条文与庄重社论专用语，表达无一例外的绝对约束力。',
        grammars: [
          {
            id: 'g_n1_5',
            pattern: '〜といえども (といえども)',
            meaning: '虽说是…但即便如此也… (极强原则性让步)',
            connection: '名词 / 动词普通体 + といえども',
            aiExplanation: '【语法说明】古代文语让步句。「虽说是处于如此高位或特权之身份，但在此绝对法则面前亦不得破例违背」。',
            exampleSentence: {
              japanese: 'たとえ大統領といえども、法を無視することは許されない。',
              furigana: 'たとえだいとうりょうといえども、ほうをむしすることはゆるされない。',
              chinese: '即便是总统之尊，亦绝不容许凌驾于法律之上。'
            }
          },
          {
            id: 'g_n1_6',
            pattern: 'A であれ B であれ',
            meaning: '无论是 A 还是 B (均毫无例外完全适用)',
            connection: '名词 + であれ + 名词 + であれ',
            aiExplanation: '【语法说明】文语「であれ」是「であっても」的古风变体。将两个性质不同或对立的极端并列，断言同一规则彻底适用于所有情形。',
            exampleSentence: {
              japanese: '学生であれ社会人であれ、学び続けることは大切だ。',
              furigana: 'がくせいであれしゃかいじんであれ、まなびつづけることはたいせつだ。',
              chinese: '无论是学生还是已参加工作的人，持续学习都很重要。'
            }
          }
        ]
      }
    ]
  }
]

// 分级用于本应用学习编排，不代表官方公布的完整 JLPT 出题词表或语法表。
export const JLPT_CURRICULUM: LevelCurriculum[] = BASE_CURRICULUM.map(level => ({
  ...level, chapters: [...level.chapters, ...(EXTRA_CHAPTERS[level.level] ?? [])],
}))
