#!/usr/bin/env node
// CLAUDE.md 커밋 컨벤션 검증: "feat:/fix:/refactor:/docs:/chore: 설명", 제목 50자 이내.
const fs = require("fs");

const commitMsgFile = process.argv[2];
if (!commitMsgFile) process.exit(0);

const message = fs.readFileSync(commitMsgFile, "utf8");
const firstLine = message.split("\n")[0].trim();

if (/^(Merge |Revert |fixup!|squash!)/.test(firstLine)) process.exit(0);

const ALLOWED_TYPES = ["feat", "fix", "refactor", "docs", "chore"];
const pattern = new RegExp(`^(${ALLOWED_TYPES.join("|")}): .+`);

if (!pattern.test(firstLine)) {
  console.error(`\n❌ 커밋 메시지는 "${ALLOWED_TYPES.join("/")}: 설명" 형식으로 시작해야 합니다.`);
  console.error(`   현재: "${firstLine}"\n`);
  process.exit(1);
}

if (firstLine.length > 50) {
  console.error(`\n❌ 커밋 메시지 제목은 50자 이내여야 합니다. (현재 ${firstLine.length}자)`);
  console.error(`   "${firstLine}"\n`);
  process.exit(1);
}
