#!/usr/bin/env node
// Tellory 冒烟测试：真实 SDK 解析 + 逐段多配置渲染
const path = require("path");
const fs = require("fs");
const sdk = require("tellory");

const file = process.argv[2];
const source = fs.readFileSync(file, "utf-8");

const story = sdk.parseStorySource(source);
console.log("title      :", story.title);
console.log("start      :", story.startPassage);
console.log("passages   :", story.passages.length, "->",
  story.passages.map((p) => p.name).join(", "));

const ctx = sdk.createDefaultEvaluator({});

const base = {
  toldCop: false, foundWatch: false, foundNote: false,
  readPaper: false, calledHospital: false, deniedWoman: false,
  knowManLies: false, how: "none",
};
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function truthy() {
  const v = clone(base);
  Object.keys(v).forEach((k) => { if (k !== "how") v[k] = true; });
  return v;
}
const configs = [
  clone(base),
  Object.assign(truthy(), { how: "cop" }),
  Object.assign(truthy(), { how: "woman" }),
  Object.assign(truthy(), { how: "station" }),
];

const leftover = /\((?:if|else|elseif|set|link|call|display|print|goto)\s*:|\[\[|\]\]/;
const problems = [];
let renders = 0;
for (const passage of story.passages) {
  for (const cfg of configs) {
    try {
      const html = sdk.renderStoryText(passage.content, cfg, story, ctx);
      renders++;
      if (!html || !html.trim()) {
        problems.push(`${passage.name} 渲染为空 @cfg ${JSON.stringify(cfg).slice(0,40)}`);
        continue;
      }
      if (leftover.test(html)) {
        const hit = html.match(leftover);
        problems.push(`${passage.name} 残留宏记号: ${hit[0]} @ ${JSON.stringify(cfg).slice(0,40)}`);
      }
    } catch (e) {
      problems.push(`${passage.name} 抛异常: ${e.message} @ ${JSON.stringify(cfg).slice(0,40)}`);
    }
  }
}
console.log("\n渲染次数:", renders);
console.log(problems.length ? "问题:\n  - " + problems.join("\n  - ") : "全部段落多配置渲染通过，无残留宏、无异常。");
process.exit(problems.length ? 1 : 0);