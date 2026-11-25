import {SpriteConfig} from './utils/helper';

export interface DialogueLine {
  id: number;
  speaker: string;
  spriteId: 'sprite_lien_hoodie' | 'sprite_quan_gia_lam';
  action: string;
  dialogue: string;
  dramaticShake?: boolean;
}

/**
 * Rich thematic palette & typography for Later Lê Dynasty Vietnamese Visual Novel.
 */
export const THEME = {
  colors: {
    canvasFallbackBg: '#120d0a',
    menuFallbackTop: '#2c1e14',
    menuFallbackBottom: '#140e0a',
    sceneFallbackTop: '#161b22',
    sceneFallbackBottom: '#0d0b09',
    ebonyPanel: '#1a110d',
    ebonyPanelDeep: '#120b08',
    ebonyButtonBg: '#2b1c14',
    dangerButtonBg: '#381a16',
    rosewoodBorder: '#5c3a24',
    gildedBorder: '#b68945',
    gildedGold: '#e2b866',
    gildedGoldBright: '#f6d58e',
    gildedActionBg: '#d4a853',
    jadeAccent: '#8fa88e',
    stageActionText: '#e8c98f',
    dialogueText: '#f7f1e5',
    speakerLienBadge: '#3a4f3e',
    speakerQuanGiaBadge: '#2c2738',
    darkRedBtnTop: '#6b1616',
    darkRedBtnBottom: '#3d0a0a',
    darkRedBtnBorder: '#d4a853',
    darkRedBtnText: '#fef3c7',
    badgeRed: '#8B1E1E',
    badgeGold: '#D4AF37',
    badgeBrown: '#4A2511',
    featheredModalCloseYellow: '#FFD700',
    dustMote: 'rgba(235, 214, 175, 0.28)',
    lightShaftTop: 'rgba(148, 178, 198, 0.12)',
    lightShaftBottom: 'rgba(148, 178, 198, 0.0)',
    lampGlowInner: 'rgba(255, 194, 88, 0.24)',
    lampGlowOuter: 'rgba(245, 138, 42, 0.0)',
  },
  fonts: {
    heading: "'Noto Serif', 'Playfair Display', Georgia, serif",
    body: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  },
  ui: {
    buttonRadius: '10px',
    panelRadius: '14px',
    borderStrokeWidth: 2,
  },
} as const;

/**
 * Exact linear script for Scene 1 (Cảnh 1) from the approved GDD.
 */
export const SCENE_1_SCRIPT: readonly DialogueLine[] = [
  {
    id: 1,
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Uể oải mở mắt, ngáp dài một tiếng, đưa tay xoa thái dương và bóp vai]',
    dialogue:
      '"Ưm... mệt rã rời cả người... Rõ ràng lúc nãy mình mệt quá nên ngủ thiếp đi ở nhà con Ly cơ mà... Ủa, sao cái đệm nhà nó hôm nay vừa cứng vừa ngứa ngáy thế này, đau hết cả lưng ngọc của tui rồi!"',
  },
  {
    id: 2,
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Mắt vẫn nhắm tịt, theo thói quen quờ tay sang bên cạnh sờ soạng tìm điện thoại]',
    dialogue:
      '"Đâu rồi... cái điện thoại của mình đâu rồi nhỉ? Phải check xem mấy giờ rồi với lướt tin nhắn một cái chứ... Ủa, sao sờ toàn thấy rơm khô với chiếu cói rách bươm trải thẳng xuống đất thế này?!"',
  },
  {
    id: 3,
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Mở choàng mắt, nhìn đống củi khô, chum vại xung quanh rồi bĩu môi cười khúc khích]',
    dialogue:
      '"À há! Lại là trò của thằng Phong, thằng Hùng với con Bảo, con Ly chứ gì! Chắc thấy mình ngủ say như chết nên cả lũ hùa nhau giấu điện thoại rồi khiêng ra xó kho phim trường cổ trang quay clip giấu camera ẩn troll mình đây mà. Hứ, bày đặt ghê!"',
  },
  {
    id: 4,
    speaker: 'Quản gia Lâm (Ngoài hành lang trực gác)',
    spriteId: 'sprite_quan_gia_lam',
    action: '[Gõ mạnh gậy gỗ xuống nền gạch, quát lạnh lẽo]',
    dialogue:
      '"Con Liên! Giờ Dần đã điểm, khách quý họ Trương sắp tới phủ đối chiếu văn tự với con Mận. Ngươi còn nằm vùi trong ổ rơm xó kho đó làm gì, muốn nếm đủ ba mươi trượng gia pháp trước mặt Quan lớn hay sao?!"',
    dramaticShake: true,
  },
  {
    id: 5,
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action: '[Chống nạnh, lè lưỡi trêu ngươi về phía cửa kho]',
    dialogue:
      '"Ối dồi ôi sợ quá cơ! Thuê hẳn diễn viên quần chúng đóng vai quản gia quát như thật, lại còn bắt mình nằm ổ rơm cho đúng chuẩn nô tì nữa chứ! Để chị đây đứng dậy tìm xem chúng mày giấu điện thoại với camera ở xó nào!"',
  },
];

export const START_SCREEN_SUBTITLE =
  'Tỉnh giấc giữa kinh thành Thăng Long năm 1484, nhập vai giải mã những ẩn khuất và chạm vào hào khí một thời vàng son.';

export const SCENE_1_CHOICE_LABEL =
  'Lồm cồm đứng dậy khỏi ổ rơm, phủi bụi trên vạt áo';

export type Scene2ChoiceId = 'A' | 'B' | 'C';

export interface Scene2InspectionItem {
  id: Scene2ChoiceId;
  buttonLabel: string;
  speaker: string;
  spriteId: 'sprite_lien_hoodie';
  action: string;
  dialogue: string;
}

/**
 * Scene 2 (Cảnh 2) - Step 1 investigative choices & exact Vietnamese lines.
 */
export const SCENE_2_INSPECTIONS: readonly Scene2InspectionItem[] = [
  {
    id: 'A',
    buttonLabel: '(A) Kiểm tra ngọn đèn dầu trên chum sành',
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Chớp chớp mắt, đưa ngón tay chọc thử vào gần ngọn lửa rồi rụt phắt lại, thổi phù phù]',
    dialogue:
      '"Ái! Nóng phỏng cả tay! Mùi dầu lạc cháy khét lẹt với bấc cỏ khô thật sự... Ủa, đạo cụ phim trường gì mà chơi hàng thật nguy hiểm vậy trời?"',
  },
  {
    id: 'B',
    buttonLabel: '(B) Kiểm tra khe cửa gỗ nhìn ra hành lang',
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action: '[Áp mắt vào khe vách, nụ cười tẻn tẻn tắt ngấm]',
    dialogue:
      '"Sân gạch rêu phong, lính gác cầm giáo đứng nghiêm dưới sương mù, xa xa là mái đình cong vút... Không cột điện, không ánh đèn đường, không một tiếng còi xe... Khoan đã, phim trường nào rộng lớn y như thật thế này?!"',
  },
  {
    id: 'C',
    buttonLabel: '(C) Kiểm tra đống chum vại, củi khô quanh kho',
    speaker: 'Liên (Bạn)',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Lật tung mấy bó rơm và ngó sau chum sành, lấm lem bụi đất, mếu máo]',
    dialogue:
      '"Không có dây điện, không có ống kính, đến một góc ổ cắm cũng chẳng thấy đâu! Mình vẫn mặc nguyên cái áo hoodie từ nhà con Ly tối qua... Rốt cuộc chỗ quái quỷ này là đâu thế này, chẳng lẽ... không phải trò đùa thật sao?!"',
  },
];

export const SCENE_2_BACK_LABEL = 'Quay lại';

/**
 * Scene 2 (Cảnh 2) - Step 2 shudder & dó paper discovery lines.
 */
export const SCENE_2_SHUDDER_LINE: DialogueLine = {
  id: 201,
  speaker: 'Liên (Bạn)',
  spriteId: 'sprite_lien_hoodie',
  action:
    '[Hoảng hốt rùng mình lùi lại dựa lưng vào vách đất, hai tay vô thức ôm chặt lấy ngực áo đang đập thình thịch thì bỗng khựng lại khi chạm phải một vật gì đó cồm cộm bên trong túi áo]',
  dialogue: '"Ơ... cái gì cồm cộm ở túi trước áo thế này?"',
};

export const SCENE_2_POCKET_BUTTON_LABEL = '(A) Kiểm tra túi trước áo hoodie';

export const SCENE_2_DO_PAPER_LINE: DialogueLine = {
  id: 202,
  speaker: 'Liên (Bạn)',
  spriteId: 'sprite_lien_hoodie',
  action:
    '[Luống cuống thọc tay vào túi áo, lôi ra một mảnh giấy dó vàng ố gấp tư, nhăn mặt ngơ ngác]',
  dialogue:
    '"Ủa cái gì đây?! sao trong túi áo mình lại lòi ra một tờ giấy cổ lỗ sĩ thế này?!"',
};

export const SCENE_2_READ_PAPER_LABEL = 'Đọc tờ giấy dó';

/**
 * Scene 3 (Cảnh 3) - Phase 1: Liên's 4-line thought sequence upon reading the Dó paper.
 */
export const SCENE_3_DIALOGUE_SCRIPT: readonly DialogueLine[] = [
  {
    id: 301,
    speaker: 'Liên',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Chết sững vài giây, hai tay siết chặt mép giấy, giọng run run hoảng hốt]',
    dialogue:
      '"Lìa dương... chưa tròn giấc mộng trên giường... Ý nó nói lúc nãy mình thức đêm cày game ở nhà con Ly... rồi đột quỵ chết luôn rồi sao?!"',
  },
  {
    id: 302,
    speaker: 'Liên',
    spriteId: 'sprite_lien_hoodie',
    action: '[Ngồi phịch xuống đống rơm, mũi cay xè tủi thân, mếu máo]',
    dialogue:
      '"Huhu... thật sự không phải trò đùa của lũ bạn rồi... Mình chết trẻ thế này, chưa kịp tiêu hết tiền lì xì, cũng chẳng còn đường về nhà méc mẹ nữa... tự dưng nhớ nhà , nhớ quê ghê á . Người ta có câu gì ta ....ừm , thôi quên rồi ,thôi khỏi nghĩ nữa ."',
  },
  {
    id: 303,
    speaker: 'Liên',
    spriteId: 'sprite_lien_hoodie',
    action:
      "[Bỗng khựng lại, cúi xuống nhìn chằm chằm vào dòng chữ 'Vua Thánh Tông trị', đôi mắt đang ướt nhòe chợt sáng rực lên đầy phấn khích]",
    dialogue:
      '"Khoan đã... \'Thăng Long kinh kỳ... Vua Thánh Tông trị\'... Là vua Lê Thánh Tông sao?! Trời ơi, mình là học sinh giỏi Sử mà! Ngài chính là vị minh quân đỉnh nhất thời Hậu Lê, thần tượng số một của mình trong sách giáo khoa đây mà! Nếu đã xuyên về đây thật, biết đâu mình còn có cơ hội nhìn thấy idol bằng xương bằng thịt!"',
  },
  {
    id: 304,
    speaker: 'Liên',
    spriteId: 'sprite_lien_hoodie',
    action:
      '[Quệt vội nước mắt, nheo mắt nhìn kỹ bốn câu giữa của bài vè, giọng đầy nghi hoặc, mơ hồ]',
    dialogue:
      '"Nhưng mà... \'Niên hiệu thứ hai quang minh, mười lăm năm chẵn, sử xanh khắc bia...\' Vua Lê Thánh Tông có tận hai niên hiệu, vậy rốt cuộc mình đang đứng ở chính xác năm nào đây nhỉ?!"',
  },
];

/**
 * Scene 3 (Cảnh 3) - Exact 10-line poem on yellowed Dó paper (`giaydo_baive`) & passcode `1484`.
 */
export const SCENE_3_POEM_LINES: readonly string[] = [
  'Tham vui thức trắng thâu canh,',
  'Mê trò ảo mộng, thân đành lìa dương!',
  'Chưa tròn giấc mộng trên giường,',
  'Hồn theo gió cuốn, lạc đường ngàn năm.',
  'Thăng Long kinh kỳ xa xăm,',
  'Vua Thánh Tông trị, trăng rằm thái bình.',
  'Niên hiệu thứ hai quang minh,',
  'Mười lăm năm chẵn, sử xanh khắc bia.',
  'Kiếp này mang phận nô tì,',
  'Tìm ba Ấn Tín mới thì hồi hương!',
];

export const SCENE_3_PUZZLE_PROMPT =
  'Theo bài vè cổ, hiện tại đang là năm bao nhiêu? (Nhập 4 chữ số)';
export const SCENE_3_CORRECT_PASSCODE = '1484';
export const SCENE_3_PUT_AWAY_LABEL = 'Cất';
export const SCENE_3_REOPEN_PAPER_LABEL = 'Mở tờ giấy';
export const SCENE_3_CONFIRM_LABEL = 'Xác nhận';
export const SCENE_3_WRONG_PASSCODE_MSG =
  'Mật mã chưa chính xác, hãy suy ngẫm lại bài vè!';

export const SCENE_3_EXPLANATION_TITLE = 'Chính xác! Đáp án: 1484';
export const SCENE_3_EXPLANATION_BODY =
  'Giải thích: Vua Lê Thánh Tông có 2 niên hiệu: Quang Thuận từ 1460–1469 và Hồng Đức từ 1470–1497. Năm Hồng Đức thứ 15 là 1470 + 14 = 1484, cũng là năm dựng bia Tiến sĩ đầu tiên tại Văn Miếu.';
export const SCENE_3_CLAIM_REWARD_LABEL = 'Nhận phần thưởng';

export const HINT_CONFIRM_PROMPT =
  'Bạn có muốn tiêu hao 1 Nến Tri Thức để nhận gợi ý không?';
export const SAVE_STORAGE_KEY = 'hlplk_save_v2';

/**
 * Hint System ("Gợi ý" & "Ngọn Nến Tri Thức") Constants.
 * Strictly plain header `"Gợi ý"` without any numbers when displayed in the black feathered modal.
 */
export const INITIAL_KNOWLEDGE_CANDLES = 1;
export const MAX_HINTS_PER_SCENE = 3;
export const HINT_EXHAUSTED_MSG = 'Bạn đã dùng hết 3 lượt gợi ý cho cảnh này';

export const SCENE_HINTS_BY_SCENE: Record<number, readonly string[]> = {
  3: [
    'Thời gian không nằm ở những lời than vãn đầu bài vè. Hãy chú ý đến hai câu nhắc về sự hưng thịnh của triều đại và một công trình lưu danh người đỗ đạt tại kinh thành.',
    "Vị minh quân trị vì 38 năm này từng dùng hai niên hiệu. Hãy xác định niên hiệu thứ hai của ngài bắt đầu khi nào, và sự kiện 'sử xanh khắc bia' đầu tiên diễn ra vào năm thứ bao nhiêu của niên hiệu đó.",
    'Năm đầu tiên của một niên hiệu luôn được tính là năm thứ nhất (nguyên niên), không phải năm thứ không. Hãy lấy mốc năm bắt đầu niên hiệu thứ hai cộng thêm khoảng cách chênh lệch thực tế đến năm thứ mười lăm.',
  ],
};

/**
 * Knowledge Candle Quiz Mini-Game ("Tích lũy Nến Tri Thức") — Exact 10-Question Bank.
 * Q1–Q9 (Short Answer & True/False) carry ~90% total selection pool weight while Q10 remains eligible.
 */
export type QuizQuestionType = 'SHORT_ANSWER' | 'TRUE_FALSE' | 'MULTIPLE_CHOICE';

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  question: string;
  options?: readonly string[];
  correct: string;
  weight: number;
}

export const QUIZ_QUESTION_BANK: readonly QuizQuestion[] = [
  {
    id: 1,
    type: 'SHORT_ANSWER',
    question:
      'Sau khi đánh thắng quân Minh, Lê Lợi chính thức lên ngôi hoàng đế tại Đông Kinh, lập ra triều đại nhà Hậu Lê vào năm nào?',
    correct: '1428',
    weight: 1,
  },
  {
    id: 2,
    type: 'SHORT_ANSWER',
    question:
      'Bộ luật thành văn tiêu biểu nhất của nhà Lê Sơ là Quốc triều hình luật (thường gọi là Luật Hồng Đức) được ban hành chính thức vào năm nào?',
    correct: '1483',
    weight: 1,
  },
  {
    id: 3,
    type: 'SHORT_ANSWER',
    question:
      'Giai đoạn Lê Sơ chấm dứt khi Mạc Đăng Dung ép vua Lê Cung Hoàng nhường ngôi, lập ra triều Mạc vào năm nào?',
    correct: '1527',
    weight: 1,
  },
  {
    id: 4,
    type: 'SHORT_ANSWER',
    question:
      'Tính từ khi vua Lê Thái Tổ lên ngôi (1428) đến khi triều đại này chấm dứt hoàn toàn sau chiến thắng Ngọc Hồi – Đống Đa (1789), vương triều Hậu Lê đã tồn tại tổng cộng bao nhiêu năm?',
    correct: '361',
    weight: 1,
  },
  {
    id: 5,
    type: 'TRUE_FALSE',
    question:
      'Nhận định sau Đúng hay Sai: Thời Lê Thánh Tông, Lục bộ là sáu cơ quan chuyên môn cao nhất phụ trách các lĩnh vực trọng yếu của triều đình trung ương.',
    correct: 'Đúng',
    weight: 1,
  },
  {
    id: 6,
    type: 'TRUE_FALSE',
    question:
      'Nhận định sau Đúng hay Sai: Thời Lê Thánh Tông, Lục khoa có chức năng trực tiếp điều hành quân đội và thu thuế thay cho Lục bộ ở các địa phương.',
    correct: 'Sai',
    weight: 1,
  },
  {
    id: 7,
    type: 'TRUE_FALSE',
    question:
      'Nhận định sau Đúng hay Sai: Việc thiết lập ba ty ngang quyền (Đô ty, Thừa ty, Hiến ty) ở mỗi đạo thừa tuyên nhằm tạo thế kiềm chế lẫn nhau, hạn chế sự tập trung quyền lực vào tay một viên quan địa phương.',
    correct: 'Đúng',
    weight: 1,
  },
  {
    id: 8,
    type: 'TRUE_FALSE',
    question:
      'Nhận định sau Đúng hay Sai: Quốc triều hình luật (Luật Hồng Đức) hoàn toàn sao chép nguyên văn bộ luật của nhà Minh (Trung Quốc) mà không có sự điều chỉnh cho phù hợp với thực tiễn Đại Việt.',
    correct: 'Sai',
    weight: 1,
  },
  {
    id: 9,
    type: 'TRUE_FALSE',
    question:
      'Nhận định sau Đúng hay Sai: Mọi thần dân thời Lê Sơ, kể cả con nhà phường chèo, nô tì hay người đang có tang cha mẹ, đều được tự do đăng ký dự thi nếu có học vấn.',
    correct: 'Sai',
    weight: 1,
  },
  {
    id: 10,
    type: 'MULTIPLE_CHOICE',
    question:
      'Việc vua Lê Thánh Tông bãi bỏ chức Tể tướng và các chức Đại hành khiển, đồng thời trực tiếp nắm quyền chỉ huy tối cao quân đội phản ánh mục tiêu cốt lõi nào?',
    options: [
      'A. Phân chia quyền lực đồng đều giữa hoàng đế và đại thần.',
      'B. Tập trung tối đa quyền lực vào tay nhà vua, hạn chế lộng quyền.',
      'C. Chuyển đổi sang quân chủ lập hiến.',
      'D. Tăng cường tính tự trị cho các địa phương.',
    ],
    correct: 'B',
    weight: 1,
  },
];

export const QUIZ_WIN_MSG = 'Chúc mừng! Bạn đã nhận được 1 Ngọn Nến Tri Thức';
export const QUIZ_FAIL_MSG = 'Chưa chính xác! Hãy thử lại lượt câu hỏi mới nhé.';

/**
 * Historical Badge Collection System ("Bộ sưu tập").
 */
export interface BadgeDefinition {
  id: string;
  assetKey: string;
  title: string;
  detailText: string;
}

export const BIA_TIEN_SI_BADGE: BadgeDefinition = {
  id: 'huyhieu_biatiensi',
  assetKey: 'huyhieu_biatiensi',
  title: 'Bia Tiến Sĩ Khoa Nhâm Tuất',
  detailText:
    'Bạn có biết? Thời vua Lê Thánh Tông, đỗ Tiến sĩ không chỉ được khắc tên lên bia đá mà còn được triều đình "bao trọn gói" lễ Vinh quy bái tổ: vua ban mũ áo, mở tiệc yến tại vườn Thượng Uyển và cấp quân lính rước võng lọng linh đình về tận quê nhà.',
};

export const COLLECTION_BADGES: readonly BadgeDefinition[] = [
  BIA_TIEN_SI_BADGE,
];

export interface SceneBackgroundSlot {
  sceneNumber: number;
  key: string;
  alias: string;
  defaultPath: string;
  aspectRatio: number;
  width: number;
  height: number;
  preloadByDefault: boolean;
}

/**
 * Extensible Scene Background Mapping Dictionary (Scene 1 -> Scene 7+).
 * Scene 2 and Scene 3 share `nencanh2` (`assets/images/nencanh2.png`).
 */
export const SCENE_BACKGROUND_REGISTRY: Record<number, SceneBackgroundSlot> = {
  1: {
    sceneNumber: 1,
    key: 'scene1_background',
    alias: 'Scene1_Background',
    defaultPath: 'assets/images/scene1_background.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: true,
  },
  2: {
    sceneNumber: 2,
    key: 'nencanh2',
    alias: 'Scene2_Background',
    defaultPath: 'assets/images/nencanh2.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: true,
  },
  3: {
    sceneNumber: 3,
    key: 'nencanh2',
    alias: 'Scene3_Background',
    defaultPath: 'assets/images/nencanh2.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: true,
  },
  4: {
    sceneNumber: 4,
    key: 'nencanh2',
    alias: 'Scene4_Background',
    defaultPath: 'assets/images/nencanh2.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: true,
  },
  5: {
    sceneNumber: 5,
    key: 'nencanh5',
    alias: 'Scene5_Background',
    defaultPath: 'assets/images/nencanh5.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: false,
  },
  6: {
    sceneNumber: 6,
    key: 'nencanh6',
    alias: 'Scene6_Background',
    defaultPath: 'assets/images/nencanh6.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: false,
  },
  7: {
    sceneNumber: 7,
    key: 'nencanh7',
    alias: 'Scene7_Background',
    defaultPath: 'assets/images/nencanh7.png',
    aspectRatio: 1376 / 768,
    width: 1376,
    height: 768,
    preloadByDefault: false,
  },
};

/**
 * Configuration for the game.
 */
export const CONFIG = {
  // Core game initialization values
  title: {
    value: 'Hậu Lê Phiêu Lưu Ký',
    type: 'string',
    label: 'Game Title',
    group: 'GAME',
  },
  baseCanvasWidth: {
    value: 1376,
    type: 'number',
    label: 'Base Canvas Width',
    group: 'GAME',
  },
  baseCanvasHeight: {
    value: 768,
    type: 'number',
    label: 'Base Canvas Height',
    group: 'GAME',
  },

  // Preserved template key
  playerSprite: {
    value: undefined as SpriteConfig | undefined,
    type: 'sprite',
    label: 'Player Sprite',
    group: 'Visuals',
  },

  // System Constants for the update loop
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'SYSTEM',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'SYSTEM',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'SYSTEM',
  },

  // Thematic elements enforcing the Later Lê visual novel aesthetic
  backgroundColor: {
    value: '#120d0a',
    type: 'color',
    label: 'Background Color',
    group: 'THEME',
  },
  primaryColor: {
    value: '#e2b866',
    type: 'color',
    label: 'Primary Color',
    group: 'THEME',
  },
  fontFamily: {
    value: "'Be Vietnam Pro', sans-serif",
    type: 'string',
    label: 'Font Family',
    group: 'THEME',
  },

  // Standard audio levels
  defaultMusicVolume: {
    value: 0.18,
    type: 'number',
    label: 'Default Music Volume',
    group: 'AUDIO',
  },
  defaultSfxVolume: {
    value: 0.6,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'AUDIO',
  },

  // Visual Novel Reading & Presentation Rules
  enableTypewriter: {
    value: true,
    type: 'boolean',
    label: 'Hiệu ứng chạy chữ (Typewriter)',
    group: 'Rules',
  },
  typewriterCharsPerSec: {
    value: 55,
    type: 'number',
    label: 'Tốc độ chạy chữ (ký tự/giây)',
    group: 'Rules',
  },
  enableDialogueShake: {
    value: true,
    type: 'boolean',
    label: 'Rung khung thoại kịch tính',
    group: 'Visuals',
  },
  dialogueShakeIntensity: {
    value: 6,
    type: 'number',
    label: 'Cường độ rung khung thoại',
    group: 'Visuals',
  },
  dialogueShakeDuration: {
    value: 0.42,
    type: 'number',
    label: 'Thời lượng rung khung thoại (giây)',
    group: 'Visuals',
  },
  inactivePortraitBrightness: {
    value: 0.32,
    type: 'number',
    label: 'Độ sáng nhân vật không thoại',
    group: 'Visuals',
  },
  portraitTransitionSpeed: {
    value: 6,
    type: 'number',
    label: 'Tốc độ chuyển chân dung',
    group: 'Visuals',
  },
  ambientDustCount: {
    value: 26,
    type: 'number',
    label: 'Số hạt bụi ánh sáng kho cổ',
    group: 'Visuals',
  },
  completionScore: {
    value: 100,
    type: 'number',
    label: 'Completion Score',
    group: 'Rules',
  },

  // Layout coordinates on 1376x768 canvas
  lienTargetX: {
    value: 170,
    type: 'number',
    label: 'Liên Portrait X',
    group: 'Layout',
  },
  lienTargetY: {
    value: 84,
    type: 'number',
    label: 'Liên Portrait Y',
    group: 'Layout',
  },
  quanGiaTargetX: {
    value: 825,
    type: 'number',
    label: 'Quản Gia Lâm Portrait X',
    group: 'Layout',
  },
  quanGiaTargetY: {
    value: 74,
    type: 'number',
    label: 'Quản Gia Lâm Portrait Y',
    group: 'Layout',
  },
  dialogueBoxBottomMargin: {
    value: 14,
    type: 'number',
    label: 'Dialogue Box Bottom Margin',
    group: 'Layout',
  },

  // Exact Asset Dimensions & Aspect Ratios from read_assets_metadata
  // 1. menu_background: 1376x768
  assetMenuBgAspectRatio: {
    value: 1376 / 768,
    type: 'number',
    label: 'Menu Background Aspect Ratio',
    group: 'ASSETS',
  },
  assetMenuBgWidth: {
    value: 1376,
    type: 'number',
    label: 'Menu Background Width',
    group: 'ASSETS',
  },
  assetMenuBgHeight: {
    value: 768,
    type: 'number',
    label: 'Menu Background Height',
    group: 'ASSETS',
  },

  // 2. scene1_background: 1376x768
  assetScene1BgAspectRatio: {
    value: 1376 / 768,
    type: 'number',
    label: 'Scene 1 Background Aspect Ratio',
    group: 'ASSETS',
  },
  assetScene1BgWidth: {
    value: 1376,
    type: 'number',
    label: 'Scene 1 Background Width',
    group: 'ASSETS',
  },
  assetScene1BgHeight: {
    value: 768,
    type: 'number',
    label: 'Scene 1 Background Height',
    group: 'ASSETS',
  },

  // 2b. nencanh2 (Scene 2 & Scene 3 Background): 1376x768
  assetNenCanh2AspectRatio: {
    value: 1376 / 768,
    type: 'number',
    label: 'Scene 2 Background (nencanh2) Aspect Ratio',
    group: 'ASSETS',
  },
  assetNenCanh2Width: {
    value: 1376,
    type: 'number',
    label: 'Scene 2 Background (nencanh2) Width',
    group: 'ASSETS',
  },
  assetNenCanh2Height: {
    value: 768,
    type: 'number',
    label: 'Scene 2 Background (nencanh2) Height',
    group: 'ASSETS',
  },

  // 3. sprite_lien_hoodie: 692x947
  assetLienAspectRatio: {
    value: 692 / 947,
    type: 'number',
    label: 'Sprite Liên Aspect Ratio',
    group: 'ASSETS',
  },
  assetLienHeight: {
    value: 636,
    type: 'number',
    label: 'Sprite Liên Height',
    group: 'ASSETS',
  },
  assetLienWidth: {
    value: Math.round(636 * (692 / 947)), // 465
    type: 'number',
    label: 'Sprite Liên Width',
    group: 'ASSETS',
  },

  // 4. sprite_quan_gia_lam: 548x986
  assetQuanGiaAspectRatio: {
    value: 548 / 986,
    type: 'number',
    label: 'Sprite Quản Gia Lâm Aspect Ratio',
    group: 'ASSETS',
  },
  assetQuanGiaHeight: {
    value: 656,
    type: 'number',
    label: 'Sprite Quản Gia Lâm Height',
    group: 'ASSETS',
  },
  assetQuanGiaWidth: {
    value: Math.round(656 * (548 / 986)), // 365
    type: 'number',
    label: 'Sprite Quản Gia Lâm Width',
    group: 'ASSETS',
  },

  // 5. dialogue_box_frame: 888x277
  assetDialogueBoxAspectRatio: {
    value: 888 / 277,
    type: 'number',
    label: 'Dialogue Box Frame Aspect Ratio',
    group: 'ASSETS',
  },
  assetDialogueBoxWidth: {
    value: 1088,
    type: 'number',
    label: 'Dialogue Box Frame Width',
    group: 'ASSETS',
  },
  assetDialogueBoxHeight: {
    value: Math.round(1088 / (888 / 277)), // 339
    type: 'number',
    label: 'Dialogue Box Frame Height',
    group: 'ASSETS',
  },

  // 6. menu_button_sprite: 814x229
  assetMenuButtonAspectRatio: {
    value: 814 / 229,
    type: 'number',
    label: 'Menu Button Sprite Aspect Ratio',
    group: 'ASSETS',
  },
  assetMenuButtonWidth: {
    value: 300,
    type: 'number',
    label: 'Menu Button Sprite Width',
    group: 'ASSETS',
  },
  assetMenuButtonHeight: {
    value: Math.round(300 / (814 / 229)), // 84
    type: 'number',
    label: 'Menu Button Sprite Height',
    group: 'ASSETS',
  },

  // 7. giaydo_baive: 628x860
  assetGiayDoAspectRatio: {
    value: 628 / 860,
    type: 'number',
    label: 'Dó Paper (giaydo_baive) Aspect Ratio',
    group: 'ASSETS',
  },
  assetGiayDoWidth: {
    value: 628,
    type: 'number',
    label: 'Dó Paper Width',
    group: 'ASSETS',
  },
  assetGiayDoHeight: {
    value: 860,
    type: 'number',
    label: 'Dó Paper Height',
    group: 'ASSETS',
  },

  // 8. icon_goiy: 598x500
  assetIconGoiYAspectRatio: {
    value: 598 / 500,
    type: 'number',
    label: 'Hint Icon (icon_goiy) Aspect Ratio',
    group: 'ASSETS',
  },
  assetIconGoiYWidth: {
    value: 598,
    type: 'number',
    label: 'Hint Icon Width',
    group: 'ASSETS',
  },
  assetIconGoiYHeight: {
    value: 500,
    type: 'number',
    label: 'Hint Icon Height',
    group: 'ASSETS',
  },

  // 9. icon_bosuutap: 794x466
  assetIconBoSuuTapAspectRatio: {
    value: 794 / 466,
    type: 'number',
    label: 'Collection Icon (icon_bosuutap) Aspect Ratio',
    group: 'ASSETS',
  },
  assetIconBoSuuTapWidth: {
    value: 794,
    type: 'number',
    label: 'Collection Icon Width',
    group: 'ASSETS',
  },
  assetIconBoSuuTapHeight: {
    value: 466,
    type: 'number',
    label: 'Collection Icon Height',
    group: 'ASSETS',
  },

  // 10. nen_popup: 1376x768
  assetNenPopupAspectRatio: {
    value: 1376 / 768,
    type: 'number',
    label: 'Popup Background (nen_popup) Aspect Ratio',
    group: 'ASSETS',
  },
  assetNenPopupWidth: {
    value: 1376,
    type: 'number',
    label: 'Popup Background Width',
    group: 'ASSETS',
  },
  assetNenPopupHeight: {
    value: 768,
    type: 'number',
    label: 'Popup Background Height',
    group: 'ASSETS',
  },

  // 11. huyhieu_biatiensi: 598x852
  assetHuyHieuBiaTienSiAspectRatio: {
    value: 598 / 852,
    type: 'number',
    label: 'Badge Bia Tiến Sĩ (huyhieu_biatiensi) Aspect Ratio',
    group: 'ASSETS',
  },
  assetHuyHieuBiaTienSiWidth: {
    value: 598,
    type: 'number',
    label: 'Badge Bia Tiến Sĩ Width',
    group: 'ASSETS',
  },
  assetHuyHieuBiaTienSiHeight: {
    value: 852,
    type: 'number',
    label: 'Badge Bia Tiến Sĩ Height',
    group: 'ASSETS',
  },
};

// Merge customized config values if present via standard global or localStorage
const {GAME_CONFIG} = globalThis as {
  GAME_CONFIG?: Record<string, unknown>;
};
if (GAME_CONFIG) {
  for (const [key, value] of Object.entries(GAME_CONFIG)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

/**
 * Type helper for reading values in game code
 */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

/**
 * Optional presets
 */
export const PRESETS = {};
