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
