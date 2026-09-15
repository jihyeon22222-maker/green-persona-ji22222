import "./globals.css";

export const metadata = {
  title: "익명 건의함",
  description: "회사 구성원 누구나 익명으로 건의를 남길 수 있는 페이지",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
