export interface GrammarLessonQuestion {
  id: string
  kind: 'recognition' | 'application'
  prompt: string
  options: string[]
  correctIndex: number
  hint: string
  optionFeedback: string[]
  explanation: string
}

export interface GrammarLesson {
  grammarId: string
  goal: string
  steps: { title: string; explanation: string }[]
  contrast: { correct: string; incorrect: string; explanation: string }
  outputTask: { prompt: string; reference: string; reading: string; translation: string }
  questions: GrammarLessonQuestion[]
  sourceIds: string[]
}

// 来源用于核对语法规则；中文讲解、题目与参考表达为本项目独立编写。
export const GRAMMAR_LESSON_SOURCES: Record<string, { title: string; url: string }> = {
  tufsNoun: {
    title: '东京外国语大学：Nです／Nではありません',
    url: 'https://www.coelang.tufs.ac.jp/mt/ja/gmod/courses/c01/lesson01/step1/explanation/001.html',
  },
  jfObject: {
    title: '国际交流基金：を（动作对象）',
    url: 'https://www.jpf.go.jp/j/urawa/j_rsorcs/textbook/setsumei_pdf/setsumei03_5.pdf',
  },
  jfActionPlace: {
    title: '国际交流基金：で（动作场所）',
    url: 'https://www.jpf.go.jp/j/urawa/j_rsorcs/textbook/setsumei_pdf/setsumei04_2.pdf',
  },
  jfExistencePlace: {
    title: '国际交流基金：に（存在场所）',
    url: 'https://www.jpf.go.jp/j/urawa/j_rsorcs/textbook/setsumei_pdf/setsumei02_6.pdf',
  },
  kyotoExistence: {
    title: '京都大学「さみどり」：存在表达（います、あります）',
    url: 'https://www.samidori.k.kyoto-u.ac.jp/study/exam?id=144',
  },
  jfDesire: {
    title: '国际交流基金：Vたいです',
    url: 'https://www.jpf.go.jp/j/urawa/j_rsorcs/textbook/setsumei_pdf/setsumei10_5.pdf',
  },
}

export const GRAMMAR_LESSONS: Record<string, GrammarLesson> = {
  g_n5_1: {
    grammarId: 'g_n5_1',
    goal: '能用一句礼貌的肯定句介绍自己或他人的身份。',
    steps: [
      { title: '先确定在说谁', explanation: '「私は」把“我”设为这句话的话题。这里的助词「は」读作 wa；换成「佐藤さんは」，就变成介绍佐藤。' },
      { title: '再补充身份', explanation: '在话题后放表示身份的名词，例如「大学生」。本课先练习完整句型，不需要在两个名词之间增加「を」。' },
      { title: '用礼貌句尾收束', explanation: '「私は大学生です。」是肯定陈述；加上「か」会变成提问。「です」在这个名词判断句中表达礼貌的判断，不能机械地把所有中文“是”都翻成它。' },
    ],
    contrast: {
      correct: '私は大学生です。',
      incorrect: '私は大学生をです。',
      explanation: '「大学生」说明身份，不是动作的对象，所以本句不需要「を」。日语的谓语通常位于句末，这是常见语序，不是从中文句子“倒装”而来。',
    },
    outputTask: {
      prompt: '用「私は〜です」介绍自己的身份。可以用学生（がくせい）或留学生（りゅうがくせい）；先自己说一句，再展开参考。',
      reference: '私は留学生です。',
      reading: 'わたしはりゅうがくせいです。',
      translation: '我是留学生。',
    },
    questions: [
      {
        id: 'g_n5_1_recognition', kind: 'recognition',
        prompt: '你在自我介绍，要礼貌地陈述“我是大学生”。选择符合这个意思的句子。',
        options: ['私は大学生ですか。', '私は大学生です。', '私は大学生ではありません。', '私は大学生をです。'],
        correctIndex: 1,
        hint: '先分清肯定陈述、提问和否定，再检查身份名词后面的接法。',
        optionFeedback: [
          '句尾「か」把它变成了提问，不符合题目要求的自我介绍陈述。',
          '「私は」提出话题，「大学生です」礼貌地说明身份，正好表达“我是大学生”。',
          '「ではありません」是否定，意思变成“我不是大学生”。句子成立，但与题意相反。',
          '本句用名词说明身份；「を」不能插在「大学生」与判断句尾「です」之间。',
        ],
        explanation: '肯定的名词判断句可以按“话题＋は＋身份名词＋です”组织。先核对句子在说什么，再看句尾是在陈述还是提问。',
      },
      {
        id: 'g_n5_1_application', kind: 'application',
        prompt: '你在介绍同学佐藤，想说“佐藤同学是留学生”。选择符合题意的礼貌陈述。',
        options: ['私は留学生です。', '佐藤さんは留学生ではありません。', '佐藤さんは留学生です。', '佐藤さんは留学生ですか。'],
        correctIndex: 2,
        hint: '先检查话题是不是佐藤，再检查句尾有没有把肯定陈述改成否定或提问。',
        optionFeedback: [
          '这句介绍的是“我”，而题目要求介绍佐藤。句型可以沿用，但话题要随场景改变。',
          '这句说佐藤不是留学生，否定了题目给出的身份。',
          '把话题换成「佐藤さん」，保留「留学生です」，就能介绍他人的身份。',
          '这是在问佐藤是不是留学生，还没有作出题目要求的肯定介绍。',
        ],
        explanation: '同一个句型可以介绍不同的人。话题决定“说谁”，后面的名词与句尾决定“怎样说明这个人”。',
      },
    ],
    sourceIds: ['tufsNoun'],
  },
  g_n5_2: {
    grammarId: 'g_n5_2',
    goal: '能礼貌地否定一种身份或事物判断，并与肯定、过去表达区分。',
    steps: [
      { title: '找到要否定的名词', explanation: '「私は先生です」是在说明“我是老师”。要否定的是「先生」这一身份，而不是把话题「私は」删掉。' },
      { title: '替换判断句尾', explanation: '将名词后的「です」换成「ではありません」：私は先生ではありません。不要写成「先生ですません」。' },
      { title: '认识口语变式', explanation: '「じゃありません」「ではないです」等也能表达相应的否定。这里先练「ではありません」，不把其他成立的表达判成普遍错误。' },
    ],
    contrast: {
      correct: '私は先生ではありません。',
      incorrect: '私は先生ですません。',
      explanation: '名词判断句的否定不能把「です」和「ません」直接拼接。「ません」常出现在礼貌动词的否定形式中，例如「食べません」。',
    },
    outputTask: {
      prompt: '用「〜ではありません」说明“今天不是休息日”。提示词：今日（きょう）、休み（やすみ）。先说出来，再比较参考。',
      reference: '今日は休みではありません。',
      reading: 'きょうはやすみではありません。',
      translation: '今天不是休息日。',
    },
    questions: [
      {
        id: 'g_n5_2_recognition', kind: 'recognition',
        prompt: '对方以为你是老师，你要礼貌地回答“我不是老师”。选择符合题意的表达。',
        options: ['私は先生です。', '私は先生でした。', '私は先生ですか。', '私は先生ではありません。'],
        correctIndex: 3,
        hint: '题目要求否定现在的身份，不是在提问，也不是讲过去的身份。',
        optionFeedback: [
          '「です」是肯定判断，反而确认了自己是老师。',
          '「でした」表示过去的肯定判断，没有表达题目要求的“不是”。',
          '「か」构成疑问，不能完成这里所需的否定回答。',
          '「先生」后接「ではありません」，礼貌地否定“老师”这个身份。',
        ],
        explanation: '确认题目是否需要否定，再选择名词判断句的否定形式。不要把“过去”和“否定”当成同一件事。',
      },
      {
        id: 'g_n5_2_application', kind: 'application',
        prompt: '你带新同学参观，想说“这里不是教室”。补全：ここは教室（　）。',
        options: ['ではありません', 'です', 'でした', 'ですか'],
        correctIndex: 0,
        hint: '话题从人物换成了地点，但句末仍在否定一个名词判断。',
        optionFeedback: [
          '「教室ではありません」否定“这里是教室”，与介绍场所的语境一致。',
          '填「です」会说成“这里是教室”，含义相反。',
          '填「でした」会说成“这里以前是教室”，题目没有要求过去的判断。',
          '填「ですか」是在询问这里是不是教室，未说明“这里不是教室”。',
        ],
        explanation: '名词否定句也能说明事物和场所。把身份名词换成「教室」后，否定句尾的接法不变。',
      },
    ],
    sourceIds: ['tufsNoun'],
  },
  g_n5_3: {
    grammarId: 'g_n5_3',
    goal: '能找到“吃、喝、买、学习”等动作的对象，并用「を」连接。',
    steps: [
      { title: '先找动作', explanation: '看到「飲みます」先想“喝”；接着问自己“喝什么”。这个问题能帮助你找出本句动作直接作用的对象。' },
      { title: '把对象放在を前', explanation: '对象是「お茶」，可以组成「お茶を飲みます」。助词「を」读作 o，书写时仍写「を」。' },
      { title: '区分对象和地点', explanation: '「学校で日本語を勉強します」中，学校是学习的地点，日本語是学习的对象。本课练「を」的对象用法；「を」还有经过地点、离开起点等其他用法。' },
    ],
    contrast: {
      correct: 'ジュースを飲みます。',
      incorrect: 'ジュースに飲みます。',
      explanation: '这里「ジュース」是喝的东西，用对象助词「を」。「に」可以标示时间、目的地等，但不能替代本句的对象助词。',
    },
    outputTask: {
      prompt: '用「〜を買います」说一句购买计划。可以使用パン（面包）或本（ほん，书）；先说出想买什么，再看参考。',
      reference: 'パンを買います。',
      reading: 'パンをかいます。',
      translation: '我要买面包。',
    },
    questions: [
      {
        id: 'g_n5_3_recognition', kind: 'recognition',
        prompt: '要表达“喝茶”，请用本课表示动作对象的助词补全：お茶（　）飲みます。',
        options: ['に', 'で', 'へ', 'を'],
        correctIndex: 3,
        hint: '「お茶」回答的是“喝什么”，不是“去哪里”或“在哪里喝”。',
        optionFeedback: [
          '这里茶是喝的对象；「に」不能标示这个「飲みます」的直接对象。',
          '「で」常标示动作地点或手段。本题要标示被喝的东西。',
          '「へ」可表示移动方向，喝茶并不是朝茶移动。',
          '「を」把「お茶」标为「飲みます」的对象，组成“喝茶”。',
        ],
        explanation: '“喝什么？”的答案是「お茶」，所以按“对象＋を＋动作”连接。',
      },
      {
        id: 'g_n5_3_application', kind: 'application',
        prompt: '要表达“在学校学习日语”，按本课对象用法补全：学校で日本語（　）勉強します。',
        options: ['を', 'に', 'へ', 'で'],
        correctIndex: 0,
        hint: '「学校で」已经说明地点。剩下的「日本語」回答“学习什么”。',
        optionFeedback: [
          '「日本語」是学习的对象，后接「を」；「勉強します」在这里整体作动词。',
          '本题不是朝日语这一目的地移动，也不是给某个对象做事；要标明的是学习内容。',
          '「へ」标示方向，不能在这句话中标示学习的对象。',
          '「日本語で勉強します」可表示“用日语学习”，但那是学习使用的语言，不是本题要求的“学习日语”。',
        ],
        explanation: '同一句话可以同时包含地点和对象。用「で」说明在哪里进行，用「を」说明动作作用于什么。',
      },
    ],
    sourceIds: ['jfObject', 'jfActionPlace'],
  },
  g_n5_4: {
    grammarId: 'g_n5_4',
    goal: '能说明在哪里做一个动作，并与人或物的存在地点区分。',
    steps: [
      { title: '读出句子的动作', explanation: '「勉強します」「買います」「読みます」都在说进行某个动作。先找谓语，再判断地点和这个动作的关系。' },
      { title: '用で搭起动作场景', explanation: '在「図書館で勉強します」里，图书馆是学习发生的地方。可以把「図書館」替换成「家」，表达在家学习。' },
      { title: '不要只凭中文“在”选助词', explanation: '说明猫或书在哪里通常用「に」；说明在哪里学习用「で」。事件举行的地点也可以用「で」，例如“在学校有活动”，所以不能只看见「あります」就一律选「に」。' },
    ],
    contrast: {
      correct: '家で日本語を勉強します。',
      incorrect: '家に日本語を勉強します。',
      explanation: '本句说“学习发生在家里”，不是说人或物存在于家里，因此「家」后用动作场所的「で」。',
    },
    outputTask: {
      prompt: '说一句“在某处做某事”。可用：家（いえ）、図書館（としょかん）、勉強します。检查地点后面用了什么助词。',
      reference: '家で勉強します。',
      reading: 'いえでべんきょうします。',
      translation: '在家学习。',
    },
    questions: [
      {
        id: 'g_n5_4_recognition', kind: 'recognition',
        prompt: '要表达“在图书馆学习”，补全动作发生的地点：図書館（　）勉強します。',
        options: ['に', 'で', 'を', 'へ'],
        correctIndex: 1,
        hint: '图书馆是学习发生的场所，句子没有表示移动，也没有表示某物存在。',
        optionFeedback: [
          '这里不是存在地点，也不是移动终点。「勉強します」所发生的场所用「で」。',
          '「図書館で」说明学习发生在哪里，与「勉強します」搭配。',
          '图书馆不是本句所学习的对象；「を」也不能在这里代替动作场所助词。',
          '「へ」表示移动方向，但本句的动作是学习，不是去图书馆。',
        ],
        explanation: '本题按“动作发生的场所＋で＋动作”组织。日语里不同关系要选择不同助词，不能把中文“在”固定翻成「に」。',
      },
      {
        id: 'g_n5_4_application', kind: 'application',
        prompt: '朋友问你在哪里看电影，你想回答“在家看电影”。选择符合题意的句子。',
        options: ['家へ行きます。', '家に映画があります。', '家で映画を見ます。', '家で映画を見ません。'],
        correctIndex: 2,
        hint: '同时检查三件事：地点是家、动作是看电影、句子是肯定表达。',
        optionFeedback: [
          '这是“去家里”，说明移动方向，没有回答在哪里看电影。',
          '这是在说家里有电影，并没有表达“看电影”这一动作。',
          '「家で」标出动作地点，「映画を見ます」表达看电影，两个部分共同满足题意。',
          '地点助词用对了，但「見ません」是否定，变成“不在家看电影”。',
        ],
        explanation: '地点助词只是句子的一部分。要表达完整意思，还要把动作与肯定/否定句尾一起检查。',
      },
    ],
    sourceIds: ['jfActionPlace', 'jfExistencePlace'],
  },
  g_n5_5: {
    grammarId: 'g_n5_5',
    goal: '能介绍某处有什么，并按一般用法区分人、动物与物品、植物。',
    steps: [
      { title: '先给存在地点', explanation: '“中庭里有……”可以先说「中庭に」。这里的「に」标明人或物存在的位置，不是在说明某个活动在哪里举行。' },
      { title: '再给新介绍的对象', explanation: '在本课句型中，地点后放要介绍的人或物，再接「が」：中庭に猫が……。其他语境也会用「は」等表达，本课先练这一结构。' },
      { title: '按对象选择存在动词', explanation: '一般介绍人、猫狗等动物用「います」，物品、建筑、花木用「あります」。植物有生命，但通常也用「あります」，不能只按生物学的有无生命判断。' },
    ],
    contrast: {
      correct: '学校に桜の木があります。',
      incorrect: '学校に桜の木がいます。',
      explanation: '按本课一般存在表达，树使用「あります」。这里没有把树拟人化；不要因为树是活的，就套用介绍人或动物的「います」。',
    },
    outputTask: {
      prompt: '介绍家附近有一个公园。可用：近所（きんじょ，附近）、公園（こうえん）。先判断公园属于哪种存在对象。',
      reference: '近所に公園があります。',
      reading: 'きんじょにこうえんがあります。',
      translation: '附近有一个公园。',
    },
    questions: [
      {
        id: 'g_n5_5_recognition', kind: 'recognition',
        prompt: '你看见中庭里有一只活猫。按一般存在表达补全：中庭に猫が（　）。',
        options: ['あります', '読みます', 'います', '飲みます'],
        correctIndex: 2,
        hint: '先判断「猫」属于人和动物，还是物品和植物；题目只要求说明它在那里。',
        optionFeedback: [
          '一般介绍活猫这类动物的存在用「います」，本题不把它当成物品介绍。',
          '「読みます」表示阅读，不是本题要表达的存在。',
          '猫属于动物，「猫がいます」说明有猫在那里。',
          '「飲みます」表示喝，是动作；题目只说明中庭里有猫。',
        ],
        explanation: '先判断句子是在说存在还是动作。介绍动物的存在，采用“地点＋に＋动物＋が＋います”。',
      },
      {
        id: 'g_n5_5_application', kind: 'application',
        prompt: '按一般存在表达介绍“学校里有一棵樱花树”，不使用拟人表达。选择符合题意的句子。',
        options: ['学校に桜の木があります。', '学校で桜の木があります。', '学校に桜の木がいます。', '学校に桜の木がありません。'],
        correctIndex: 0,
        hint: '分别检查地点助词和存在动词。树是植物；题目说的是有树，不是没有树或举办活动。',
        optionFeedback: [
          '「に」标示树所在的位置；植物的存在通常用「あります」，两处都符合题意。',
          '本题介绍树所在的位置，用「に」；「で」可以说明活动举行的地点，但树不是活动。',
          '植物有生命，但普通存在表达仍使用「あります」；这里没有把树当成人物。',
          '「ありません」是否定，变成“学校里没有樱花树”，与题意相反。',
        ],
        explanation: '把句子拆成“地点关系”和“对象类别”来判断。植物不能简单归为无生命，却通常与物品一样使用「あります」。',
      },
    ],
    sourceIds: ['jfExistencePlace', 'kyotoExistence'],
  },
  g_n5_6: {
    grammarId: 'g_n5_6',
    goal: '能从动词ます形构成「たいです」，表达自己想做的事。',
    steps: [
      { title: '从ます形出发', explanation: '先确认动词的礼貌形式，例如「飲みます」「買います」。本课不要求从辞书形直接推算所有动词变化。' },
      { title: '去掉ます再接たいです', explanation: '「飲みます」去掉「ます」留下「飲み」，接成「飲みたいです」。保留「ます」直接加「たい」会接错。' },
      { title: '区分愿望和行动', explanation: '「買いたいです」表达想买；「買います」可表示要买或平时买，含义不同。「たい」按い形容词方式变化；本课练自己的愿望，也可以在合适语境中用疑问句询问对方的愿望。' },
    ],
    contrast: {
      correct: '水を飲みたいです。',
      incorrect: '水を飲みますたいです。',
      explanation: '「たい」接在去掉「ます」后的部分，不能接在完整「飲みます」之后。愿望对象在一些语境中也可用「が」，不要把「水が飲みたいです」判为普遍错误。',
    },
    outputTask: {
      prompt: '说一句自己的愿望。可把「買います」变成愿望表达，再加上想买的东西，例如新しい本（あたらしいほん，新书）。',
      reference: '新しい本を買いたいです。',
      reading: 'あたらしいほんをかいたいです。',
      translation: '我想买一本新书。',
    },
    questions: [
      {
        id: 'g_n5_6_recognition', kind: 'recognition',
        prompt: '把「飲みます」改成礼貌表达“想喝”。请选择按本课规则构成的形式。',
        options: ['飲みますたいです', '飲むたいです', '飲みたいです', '飲みたいません'],
        correctIndex: 2,
        hint: '从给出的ます形开始，先去掉句尾的「ます」，再接表示愿望的部分。',
        optionFeedback: [
          '还保留着「ます」。先去掉它，再连接「たいです」。',
          '这是把「たい」直接接在辞书形「飲む」后面；本课需要用ます形去掉ます的部分。',
          '「飲みます」去掉「ます」留下「飲み」，再接「たいです」，得到“想喝”。',
          '「たい」不直接接「ません」。本题要肯定愿望；其否定可写作「飲みたくないです」。',
        ],
        explanation: '用两个动作检查接续：先去ます，再接たいです。不要把完整礼貌动词或辞书形直接接到たい前。',
      },
      {
        id: 'g_n5_6_application', kind: 'application',
        prompt: '你表达自己的愿望：“周末想买一双新鞋。”选择最符合这个意思的句子。',
        options: ['週末に新しい靴を買いたいです。', '週末に新しい靴を買いました。', '週末に新しい靴を買ってください。', '週末に新しい靴を買いません。'],
        correctIndex: 0,
        hint: '愿望、过去发生的事、请求别人做事和否定行动，是不同的表达目的。',
        optionFeedback: [
          '「買いたいです」表达说话者想买的愿望，配合时间和对象完成了题意。',
          '「買いました」表示已经买了，是过去的事实，没有表达“想买”。',
          '「買ってください」在请求别人购买，不是在陈述自己的购买愿望。',
          '「買いません」表示不买，是行动的否定，没有表达“想买”。',
        ],
        explanation: '接续正确还不够，句尾必须匹配交际目的。讲自己的愿望时使用「買いたいです」，不要与过去、请求或否定混淆。',
      },
    ],
    sourceIds: ['jfDesire'],
  },
}
