import { type NostalgiaQuestion } from "~/types/question";

/**
 * 回忆杀题库（1980–2022）
 * 答案设计：以 year 为首要标准答案；yearEnd 表示可接受的流行区间。
 * 玩家仅需猜测年份，无地图交互。
 */
export const nostalgiaQuestions: NostalgiaQuestion[] = [
  {
    type: "nostalgia",
    id: "xiaohuanxiong_cards",
    title: "集卡风潮",
    description:
      "干脆面里随机附赠的水浒人物卡片，「圣卡」「闪卡」成为小学生社交硬通货，催生了「换卡」「拍卡」等校园玩法。",
    year: 1999,
    yearEnd: 2003,
    subCategory: "snack",
    culturalScope: "cn_mainland",
    tags: ["零食", "集卡", "童年"],
    aliases: ["小浣熊水浒卡", "水浒卡", "干脆面卡片"],
    wikipediaTitle: "小浣熊干脆面",
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "mini_4wd",
    title: "四驱车热潮",
    description:
      "受日本动画影响，商场里摆满拼装赛道，马达轰鸣、贴贴纸、换轮胎，周末少年宫的比赛人山人海。",
    year: 1996,
    yearEnd: 2000,
    subCategory: "toy",
    culturalScope: "cn_mainland",
    tags: ["玩具", "动画联动"],
    aliases: ["四驱兄弟", "奥迪双钻", "迷你四驱车"],
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "legend_of_condor_heroes",
    title: "武侠剧收视奇迹",
    description:
      "改编自金庸同名小说，黄蓉的机灵、郭靖的憨厚成为国民 CP，主题曲在街头巷尾循环播放，「靖哥哥」成年度热词。",
    year: 1994,
    subCategory: "tv",
    culturalScope: "cn_hk_tw",
    tags: ["电视剧", "武侠", "金庸"],
    aliases: ["射雕英雄传", "94版射雕"],
    wikipediaTitle: "射雕英雄传_(1994年電視劇)",
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "princess_huanzhu",
    title: "清宫戏现象级热播",
    description:
      "小燕子翻墙入宫、紫薇认亲，湖南卫视首轮播出后引发全民追剧，「紫薇，等等」等台词成为模仿秀标配。",
    year: 1998,
    yearEnd: 2003,
    subCategory: "tv",
    culturalScope: "cn_mainland",
    tags: ["电视剧", "清宫", "湖南卫视"],
    aliases: ["还珠格格", "还珠"],
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "slam_dunk_anime",
    title: "篮球漫画动画化",
    description:
      "樱木花道从门外汉成长为湘北主力，三井寿的「教练，我想打篮球」台词刷屏，带动国内青少年篮球热。",
    year: 1996,
    subCategory: "anime",
    culturalScope: "global",
    tags: ["动漫", "篮球", "日本"],
    aliases: ["灌篮高手", "SLAM DUNK"],
    wikipediaTitle: "灌篮高手_(动画)",
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "big_talk_westward",
    title: "无厘头喜剧巅峰",
    description:
      "周星驰主演的解构式西游故事，「曾经有一份真挚的爱情」独白被反复恶搞，DVD 与录像厅里反复放映。",
    year: 1995,
    subCategory: "movie",
    culturalScope: "cn_hk_tw",
    tags: ["电影", "周星驰", "香港"],
    aliases: ["大话西游", "大话西游之月光宝盒"],
    wikipediaTitle: "大话西游之月光宝盒",
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "want_want_milk",
    title: "魔性广告儿歌",
    description:
      "「再看我，再看我，再看我就把你喝掉」的洗脑广告语，搭配大眼睛娃娃形象，成为超市货架上的童年记忆。",
    year: 1996,
    yearEnd: 2005,
    subCategory: "snack",
    culturalScope: "cn_mainland",
    tags: ["零食", "广告"],
    aliases: ["旺仔牛奶", "旺仔"],
    source: "manual",
  },
  {
    type: "nostalgia",
    id: "walkman_era",
    title: "随身听时代",
    description:
      "磁带仓咔嗒一声合上，耳机线绕在腰间，英语听力、流行金曲都在这一方小巧机身里循环，是出门必备的社交装备。",
    year: 1985,
    yearEnd: 1995,
    subCategory: "appliance",
    culturalScope: "global",
    tags: ["家电", "音乐", "索尼"],
    aliases: ["Walkman", "随身听", "磁带机"],
    wikipediaTitle: "Walkman",
    source: "manual",
  },
];
