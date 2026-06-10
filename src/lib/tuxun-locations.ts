export interface TuxunLocation {
  id: string;
  title: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
  panoId?: string;
  heading: number;
  pitch: number;
  hint: string;
  source?: "baidu-random" | "fallback";
}

export const TUXUN_ROUNDS = 5;

export const TUXUN_LOCATIONS: TuxunLocation[] = [
  {
    id: "beijing-tiananmen",
    title: "天安门广场",
    province: "北京",
    city: "北京",
    lat: 39.9088,
    lng: 116.3975,
    heading: 15,
    pitch: 2,
    hint: "大型城市核心广场，周边有非常强的首都地标信号。",
  },
  {
    id: "shanghai-nanjing-road",
    title: "南京东路步行街",
    province: "上海",
    city: "上海",
    lat: 31.2345,
    lng: 121.4746,
    heading: 110,
    pitch: 0,
    hint: "商业街密度极高，路牌与建筑风格有明显海派城市信号。",
  },
  {
    id: "guangzhou-canton-tower",
    title: "广州塔周边",
    province: "广东",
    city: "广州",
    lat: 23.1066,
    lng: 113.3246,
    heading: 35,
    pitch: 4,
    hint: "珠江沿线高层建筑密集，远处有醒目的城市塔形地标。",
  },
  {
    id: "xian-bell-tower",
    title: "西安钟楼",
    province: "陕西",
    city: "西安",
    lat: 34.261,
    lng: 108.942,
    heading: 85,
    pitch: 0,
    hint: "城市中心有古代楼阁式地标，道路呈环形组织。",
  },
  {
    id: "chengdu-chunxi-road",
    title: "春熙路",
    province: "四川",
    city: "成都",
    lat: 30.657,
    lng: 104.082,
    heading: 240,
    pitch: 0,
    hint: "西南核心商圈，人流与商业招牌密集。",
  },
  {
    id: "hangzhou-west-lake",
    title: "西湖湖滨",
    province: "浙江",
    city: "杭州",
    lat: 30.2587,
    lng: 120.1552,
    heading: 280,
    pitch: 0,
    hint: "湖岸、山体与城市商业界面同时出现。",
  },
  {
    id: "wuhan-yellow-crane",
    title: "黄鹤楼周边",
    province: "湖北",
    city: "武汉",
    lat: 30.5446,
    lng: 114.3049,
    heading: 145,
    pitch: 2,
    hint: "长江城市，历史楼阁与桥梁、江岸线索明显。",
  },
  {
    id: "chongqing-jiefangbei",
    title: "解放碑",
    province: "重庆",
    city: "重庆",
    lat: 29.5637,
    lng: 106.5755,
    heading: 65,
    pitch: 0,
    hint: "山城核心商圈，道路高差和密集楼宇是重要线索。",
  },
  {
    id: "nanjing-fuzimiao",
    title: "夫子庙秦淮河",
    province: "江苏",
    city: "南京",
    lat: 32.0209,
    lng: 118.7883,
    heading: 180,
    pitch: 0,
    hint: "江南历史街区，水系、牌坊与仿古建筑非常集中。",
  },
  {
    id: "suzhou-pingjiang-road",
    title: "平江路",
    province: "江苏",
    city: "苏州",
    lat: 31.3172,
    lng: 120.6307,
    heading: 205,
    pitch: 0,
    hint: "小桥流水与白墙黑瓦是核心视觉线索。",
  },
  {
    id: "qingdao-zhanqiao",
    title: "栈桥",
    province: "山东",
    city: "青岛",
    lat: 36.0649,
    lng: 120.3193,
    heading: 150,
    pitch: 0,
    hint: "海滨城市，栈桥、红瓦建筑和海岸线索明显。",
  },
  {
    id: "shenzhen-civic-center",
    title: "市民中心",
    province: "广东",
    city: "深圳",
    lat: 22.5431,
    lng: 114.0579,
    heading: 20,
    pitch: 0,
    hint: "超高层天际线和现代市政轴线是主要线索。",
  },
];

export function pickTuxunLocations(count: number): TuxunLocation[] {
  return pickTuxunFallbackLocations(count);
}

export function pickTuxunFallbackLocations(count: number): TuxunLocation[] {
  return [...TUXUN_LOCATIONS]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, TUXUN_LOCATIONS.length))
    .map((location) => ({ ...location, source: "fallback" }));
}
