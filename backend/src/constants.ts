export const VIETNAM_TZ = "Asia/Ho_Chi_Minh";

export const BOT_GITHUB_LOGIN =
  process.env.BOT_GITHUB_LOGIN || "mmenutech";

/**
 * Map githubLogin → tên đầy đủ.
 * Dùng để parse tên người trực từ Google Calendar event summary.
 * Đồng bộ với engineer-management/backend/src/constants.ts
 */
export const USER_FULL_NAMES: Record<string, string> = {
  meworainy: "Lê Thị Vân Anh",
  anhlvan: "Lê Thị Vân Anh",
  avpegnu: "Nguyễn Việt Anh",
  Canh3005: "Nguyễn Tuấn Cảnh",
  dang0101: "Nguyễn Khoa Đăng",
  DatMQhust: "Mai Quốc Đạt",
  donhuthoa: "Đỗ Như Thỏa",
  DThanh0: "Nguyễn Duy Thanh",
  "hinne-231203": "Nguyễn Thị Ngọc Hiền",
  hopquoc98: "Nguyễn Quốc Hợp",
  Killian0812: "Nguyễn Mạnh Cường",
  lovekid1997: "Nguyễn Thế Vinh",
  luannn308: "Nguyễn Ngọc Luân",
  Mai082003: "Hồ Thị Quỳnh Mai",
  maixuanhieu20215576: "Mai Xuân Hiếu",
  Mido2610: "Nguyễn Tuấn Kiệt",
  mmenutech: "mmenutech",
  quocdotri: "Đỗ Trí Quốc",
  quyenquyen100202: "Phạm Thị Quyên",
  ToHuyTheAnh0101: "Tô Huy Thế Anh",
  trangnguyen109: "Nguyễn Thị Thùy Trang",
  Tranhuutukkt: "Trần Hữu An",
  tuci31203: "Nguyễn Trung Chiến",
  txdat: "Trần Xuân Đạt",
  "dung-hoi-ten-em-nua": "Quách Thanh Ngọc",
};

/** Map githubLogin → Slack user ID (đồng bộ với engineer-management) */
export const SLACK_USER_ID_MAP: Record<string, string> = {
  maixuanhieu20215576: "U07AHNK773N",
  avpegnu: "U0924GYNC87",
  Canh3005: "U092CDNKBAP",
  dang0101: "U02NHLB9CU9",
  DatMQhust: "U08UAPQ7VS5",
  donhuthoa: "U06B3N6BUJD",
  DThanh0: "U06CK19K5AN",
  hopquoc98: "U038ADE3JFN",
  Killian0812: "U048JET3KF0",
  lovekid1997: "U02HW59KLKV",
  luannn308: "U07N6RU2UJU",
  Mido2610: "U06S5UJ995E",
  Tranhuutukkt: "U07D28T33C0",
  tuci31203: "U08FT6CGPNX",
  txdat: "U04UZHX3E6R",
  ToHuyTheAnh0101: "U07LLEXTQ1J",
};

/** Resolve githubLogin từ tên đầy đủ (trong calendar event) */
export function resolveGithubLoginByName(summary: string): string | undefined {
  const lower = summary.toLowerCase().trim();
  for (const [login, fullName] of Object.entries(USER_FULL_NAMES)) {
    if (
      fullName.length > 2 &&
      fullName !== "mmenutech" &&
      lower.includes(fullName.toLowerCase())
    ) {
      return login;
    }
  }
  // Fallback: match github login trực tiếp
  for (const login of Object.keys(USER_FULL_NAMES)) {
    if (login !== "mmenutech" && lower.includes(login.toLowerCase())) {
      return login;
    }
  }
  return undefined;
}
