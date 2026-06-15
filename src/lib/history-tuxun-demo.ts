export interface HistoryTuxunPuzzle {
  id: string;
  answerName: string;
  answerContext: string;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  fov: number;
  clues: string[];
}

export const HISTORY_TUXUN_PUZZLES: HistoryTuxunPuzzle[] = [
  {
    id: "beijing-tiananmen",
    answerName: "天安门广场",
    answerContext: "北京中轴线上的明清皇城南端，也是现代中国重要历史现场。",
    lat: 39.9088,
    lng: 116.3975,
    heading: 12,
    pitch: 2,
    fov: 92,
    clues: [
      "这处地点位于一座长期承担都城功能的城市中轴线上。",
      "明清时期，普通人很难接近它北侧的皇城空间。",
      "20 世纪中叶，一次面向广场的宣告让这里成为现代政治记忆的坐标。",
      "如果你看到宽阔广场、红墙与城楼轮廓，答案已经很近。",
    ],
  },
  {
    id: "xian-bell-tower",
    answerName: "西安钟楼",
    answerContext: "关中都城核心区的地标，周边道路至今保留强烈的城市中心感。",
    lat: 34.261,
    lng: 108.942,
    heading: 82,
    pitch: 0,
    fov: 88,
    clues: [
      "这座城市曾在多个王朝中承担全国政治中心的角色。",
      "附近的街道格局让人很容易联想到古代都城的方正规划。",
      "它不是宫殿遗址，却长期作为城市中心的视觉锚点。",
      "如果街景里出现高台楼阁和环形交通，这里很可能在关中。",
    ],
  },
  {
    id: "nanjing-presidential-palace",
    answerName: "南京总统府",
    answerContext: "南京长江路一带，曾叠加太平天国、晚清和民国政治记忆。",
    lat: 32.0432,
    lng: 118.7922,
    heading: 270,
    pitch: 0,
    fov: 90,
    clues: [
      "这处建筑群所在城市曾多次成为全国性的政治中心。",
      "同一片院落曾与太平天国、晚清两江总督和民国政治有关。",
      "它的历史线索不是单一朝代，而是近代中国政权更替的缩影。",
      "看到林荫街道、院墙与近代公共建筑气质时，优先考虑南京。",
    ],
  },
  {
    id: "wuhan-yellow-crane-tower",
    answerName: "黄鹤楼",
    answerContext: "武汉蛇山上的江城地标，与长江、诗歌和城市交通线索高度绑定。",
    lat: 30.5446,
    lng: 114.3049,
    heading: 145,
    pitch: 2,
    fov: 92,
    clues: [
      "这处地点与长江边的一座历史名楼有关。",
      "唐诗中的送别和登临意象，让它的文化辨识度远超普通景点。",
      "现代街景里可能同时出现山体、桥梁、江岸和密集道路。",
      "如果你联想到“昔人已乘黄鹤去”，地图应移向华中。",
    ],
  },
  {
    id: "chengdu-wuhou-shrine",
    answerName: "成都武侯祠",
    answerContext: "成都老城南侧的三国纪念地，围绕蜀汉君臣记忆形成街区。",
    lat: 30.6472,
    lng: 104.0474,
    heading: 215,
    pitch: 0,
    fov: 90,
    clues: [
      "这处地点与三国时期的蜀汉政权关系密切。",
      "它纪念的核心人物不只是帝王，更是一位以治国和军事谋略著称的丞相。",
      "周边街区常把历史纪念、祠庙和旅游商业混合在一起。",
      "如果线索指向刘备与诸葛亮，请把地图移到成都。",
    ],
  },
  {
    id: "hangzhou-west-lake",
    answerName: "西湖湖滨",
    answerContext: "杭州西湖东岸，连接南宋临安记忆、湖山景观和现代城市界面。",
    lat: 30.2587,
    lng: 120.1552,
    heading: 280,
    pitch: 0,
    fov: 94,
    clues: [
      "这处地点所在城市在南宋时期曾是全国政治与文化中心。",
      "它的历史感不只来自建筑，更来自湖山与城市共生的格局。",
      "文人题咏、堤岸、寺观和城市场景共同构成它的辨识度。",
      "如果街景里同时有湖面、山影和繁华城市界面，答案可能在杭州。",
    ],
  },
];

export const DEFAULT_HISTORY_TUXUN_PUZZLE = HISTORY_TUXUN_PUZZLES[0]!;

export function pickHistoryTuxunPuzzle(
  previousId?: string,
): HistoryTuxunPuzzle {
  const candidates =
    HISTORY_TUXUN_PUZZLES.length > 1
      ? HISTORY_TUXUN_PUZZLES.filter((puzzle) => puzzle.id !== previousId)
      : HISTORY_TUXUN_PUZZLES;

  return candidates[Math.floor(Math.random() * candidates.length)]!;
}
