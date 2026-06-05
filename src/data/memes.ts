import { type MemeQuestion } from "~/types/question";

/**
 * 网络哏题库（约 2005–2022）
 * 答案设计：year 为梗首次在中文互联网广泛传播的年份。
 * aliases 收录常见叫法，便于爬取去重与后续文本匹配扩展。
 */
export const memeQuestions: MemeQuestion[] = [
  {
    type: "meme",
    id: "jiong",
    title: "最早的表情包汉字",
    description:
      "一个「囧」字因字形像一张尴尬的脸，在论坛和 QQ 群被做成表情包，开启了汉字表情符号的先河。",
    year: 2008,
    subCategory: "image",
    culturalScope: "cn_mainland",
    platform: "bbs",
    tags: ["表情", "汉字", "早期互联网"],
    aliases: ["囧", "囧字"],
    source: "manual",
  },
  {
    type: "meme",
    id: "shamate",
    title: "非主流造型风潮",
    description:
      "爆炸头、浓重眼线、火星文签名，贴吧与 QQ 空间涌现大量「杀马特」自拍，成为千禧年亚文化符号。",
    year: 2008,
    subCategory: "image",
    culturalScope: "cn_mainland",
    platform: ["tieba", "bbs"],
    tags: ["亚文化", "造型", "火星文"],
    aliases: ["杀马特", "SMART", "非主流"],
    source: "manual",
  },
  {
    type: "meme",
    id: "ge_you_slouch",
    title: "慵懒躺姿表情包",
    description:
      "电视剧《我爱我家》中葛优瘫在沙发上的剧照被截图传播，「葛优躺」成为颓废松弛感的代名词。",
    year: 2016,
    subCategory: "image",
    culturalScope: "cn_mainland",
    platform: "weibo",
    tags: ["表情", "剧照", "颓废"],
    aliases: ["葛优躺", "葛优瘫", "京城瘫"],
    source: "manual",
  },
  {
    type: "meme",
    id: "blue_thin_mushroom",
    title: "方言谐音梗",
    description:
      "一段南宁方言视频里「难受、想哭」被空耳成「蓝瘦香菇」，一夜之间刷屏朋友圈和微博热搜。",
    year: 2016,
    subCategory: "video",
    culturalScope: "cn_mainland",
    platform: "weibo",
    tags: ["空耳", "方言", "短视频"],
    aliases: ["蓝瘦香菇", "难受想哭"],
    source: "manual",
  },
  {
    type: "meme",
    id: "zhen_xiang",
    title: "真香定律",
    description:
      "综艺《变形计》中王境泽口嫌体正直的经典片段：「我就是饿死也不吃」→ 随后真香。反差打脸成为万能模板。",
    year: 2018,
    subCategory: "video",
    culturalScope: "cn_mainland",
    platform: ["bilibili", "weibo"],
    tags: ["综艺", "打脸", "反差"],
    aliases: ["真香", "真香定律", "王境泽"],
    source: "manual",
  },
  {
    type: "meme",
    id: "involution",
    title: "社会学术语出圈",
    description:
      "原本的人类学术语「内卷」被用来形容无效竞争、越忙越穷，知乎长文与微博讨论将其推上年度热词榜。",
    year: 2020,
    subCategory: "phrase",
    culturalScope: "cn_mainland",
    platform: ["zhihu", "weibo"],
    tags: ["热词", "社会", "职场"],
    aliases: ["内卷", "卷"],
    source: "manual",
  },
  {
    type: "meme",
    id: "thank_you_sir",
    title: "魔性英文谐音",
    description:
      "短视频博主用夸张口音说「Thank you」被听成「栓Q」，迅速演变为表达无语、讽刺的万能回复。",
    year: 2022,
    subCategory: "phrase",
    culturalScope: "cn_mainland",
    platform: "douyin",
    tags: ["谐音", "英文", "短视频"],
    aliases: ["栓Q", "thank you"],
    source: "manual",
  },
  {
    type: "meme",
    id: "youth_is_back",
    title: "怀旧弹幕梗",
    description:
      " B 站用户看到经典老番、老游戏、老明星重聚时刷屏「爷青回」（爷的青春回来了），成为集体怀旧信号。",
    year: 2020,
    subCategory: "phrase",
    culturalScope: "cn_mainland",
    platform: "bilibili",
    tags: ["弹幕", "怀旧", "B站"],
    aliases: ["爷青回", "爷的青春回来了"],
    source: "manual",
  },
];
