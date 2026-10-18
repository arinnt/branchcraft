import { CanvasStage, drawCommitGraph, loadGame, newGraph, recordAction, saveGame, type SavedGame } from "./engine";
import { levels } from "./levels";
import commitLevel from "./levels/commit";
import "./style.css";

type Screen = "lesson" | "recap" | "quiz" | "passed" | "glossary" | "sandbox";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root is missing.");

const saved = loadGame(levels.length);
let progress: SavedGame = saved;
let screen: Screen = "lesson";
let currentIndex = Math.min(saved.unlockedLevel, levels.length - 1);
let actionCount = 0;
let quizIndex = 0;
let feedback = "";
let stage: CanvasStage | undefined;
let sandboxJars = 1;
let sandboxPipes = 1;

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);

function persist(): void {
  saveGame(progress);
}

function unlockedLevelCount(): number {
  return Math.max(0, Math.min(progress.unlockedLevel + 1, levels.length));
}

function navigation(): string {
  const unlocked = unlockedLevelCount();
  return `
    <header class="topbar">
      <button class="brand" data-screen="lesson" aria-label="Branchcraft home">
        <span class="brand-mark" aria-hidden="true">⑂</span><span>branchcraft</span>
      </button>
      <span class="topbar-caption">A hands-on Git field guide</span>
      <nav class="topnav" aria-label="Main navigation">
        <button class="${screen === "lesson" || screen === "recap" || screen === "quiz" || screen === "passed" ? "active" : ""}" data-screen="lesson">Learn</button>
        <button class="${screen === "glossary" ? "active" : ""}" data-screen="glossary">Glossary <span class="nav-count">${unlocked}</span></button>
        <button class="${screen === "sandbox" ? "active" : ""}" data-screen="sandbox">Sandbox</button>
      </nav>
    </header>`;
}

function sidebar(): string {
  const unlocked = unlockedLevelCount();
  return `
    <aside class="lesson-rail" aria-label="Course levels">
      <div class="rail-heading"><span>FIELD NOTES</span><span>${String(unlocked).padStart(2, "0")} / ${levels.length}</span></div>
      <ol class="level-list">
        ${levels.map((level, index) => {
          const isLocked = index >= unlocked;
          const isDone = progress.completed.includes(index);
          const selected = index === currentIndex && screen !== "glossary" && screen !== "sandbox";
          return `<li><button class="level-link ${selected ? "selected" : ""} ${isLocked ? "locked" : ""} ${isDone ? "completed" : ""}" ${isLocked ? "disabled" : `data-level="${index}"`}>
            <span class="level-number">${isDone ? "✓" : String(index + 1).padStart(2, "0")}</span><span>${esc(level.term)}</span>${isLocked ? '<span class="lock" aria-label="locked">⌑</span>' : ""}
          </button></li>`;
        }).join("")}
      </ol>
      <button class="reset-link" data-reset>Reset workshop</button>
    </aside>`;
}

function graphPanel(): string {
  return `
    <aside class="graph-panel">
      <div class="panel-title"><div><span class="eyebrow">LIVE WORKSHOP</span><h2>Commit graph</h2></div><span class="live-dot" aria-label="Live"></span></div>
      <canvas class="graph-canvas" aria-label="Live diagram of branches, commits, and remote"></canvas>
      <div class="graph-key"><span><i class="key-local"></i> local</span><span><i class="key-remote"></i> origin</span><span><i class="key-branch"></i> branch</span></div>
      <p class="graph-caption">Every saved batch leaves a mark in the history.</p>
    </aside>`;
}

function lessonContent(): string {
  const level = levels[currentIndex]!;
  const step = Math.min(actionCount, 3);
  return `
    <section class="lesson-content">
      <div class="level-kicker"><span>MODULE ${String(currentIndex + 1).padStart(2, "0")}</span><span class="kicker-line"></span><span>GIT FOUNDATIONS</span></div>
      <div class="lesson-heading"><div><h1>${esc(level.term)}</h1><p>${esc(level.metaphor)}</p></div><span class="term-stamp">${String(currentIndex + 1).padStart(2, "0")}</span></div>
      <div class="game-layout">
        <div class="play-column">
          <div class="stage-frame">
            <div class="stage-topline"><span>THE WORKBENCH</span><span class="stage-hint"><span class="hint-dot"></span> PROCEDURAL STUDIO</span></div>
            <canvas class="game-canvas" tabindex="0" role="button" aria-label="Interactive ${esc(level.term)} workshop. Tap or press enter to perform the action."></canvas>
            <div class="stage-instruction"><span class="instruction-icon">↳</span><span>${esc(level.instruction)}</span></div>
          </div>
          <div class="action-row">
            <div class="action-count"><span class="eyebrow">YOUR MOVE</span><strong data-step-label>${step} / 3 batches</strong></div>
            <button class="primary-button" data-action="perform" ${step >= 3 ? "disabled" : ""}>${esc(level.action)} <span aria-hidden="true">↗</span></button>
          </div>
          <div class="progress-track" aria-label="Level action progress">${[0, 1, 2].map((index) => `<span class="${index < step ? "filled" : ""}" style="--level-color:${level.color}"></span>`).join("")}</div>
        </div>
        ${graphPanel()}
      </div>
      <div class="lesson-footnote"><span>✳</span> No commands to memorize. Learn by doing, then name the move.</div>
    </section>`;
}

function recapContent(): string {
  const level = levels[currentIndex]!;
  return `
    <section class="transition-layout">
      <div class="transition-main">
        <div class="level-kicker"><span>MODULE COMPLETE</span><span class="kicker-line"></span><span>THE IDEA</span></div>
        <div class="recap-card">
          <span class="eyebrow">YOU JUST PRACTICED</span>
          <h1>${esc(level.term)}</h1>
          <p class="definition">${esc(level.definition)}</p>
          <div class="command-box"><span class="eyebrow">IN A REAL REPOSITORY</span><code>${esc(level.command)}</code></div>
          <div class="recap-metaphor"><span>✳</span><span>${esc(level.metaphor)}</span></div>
        </div>
        <div class="transition-bottom"><p>Ready to pin this term in your field notes?</p><button class="primary-button" data-action="start-quiz">Take the 3-question check <span>↗</span></button></div>
      </div>
      ${graphPanel()}
    </section>`;
}

function quizContent(): string {
  const level = levels[currentIndex]!;
  const question = level.quiz[quizIndex]!;
  return `
    <section class="transition-layout">
      <div class="transition-main">
        <div class="level-kicker"><span>FIELD CHECK</span><span class="kicker-line"></span><span>${esc(level.term.toUpperCase())}</span></div>
        <div class="quiz-card">
          <div class="quiz-progress">${[0, 1, 2].map((index) => `<span class="${index < quizIndex ? "answered" : ""} ${index === quizIndex ? "current" : ""}"></span>`).join("")}<span class="quiz-index">QUESTION ${quizIndex + 1} / 3</span></div>
          <h1>${esc(question.prompt)}</h1>
          <div class="answer-list">${question.options.map((option, index) => `<button class="answer-option" data-answer="${index}"><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option)}</span><span class="answer-arrow">↗</span></button>`).join("")}</div>
          ${feedback ? `<p class="quiz-feedback ${feedback.startsWith("Not quite") ? "incorrect" : "correct"}">${esc(feedback)}</p>` : ""}
          <p class="quiz-note">Answer correctly to add the next term to your workshop.</p>
        </div>
      </div>
      ${graphPanel()}
    </section>`;
}

function passedContent(): string {
  const level = levels[currentIndex]!;
  const next = levels[currentIndex + 1];
  return `
    <section class="transition-layout">
      <div class="transition-main">
        <div class="level-kicker"><span>FIELD NOTES UPDATED</span><span class="kicker-line"></span><span>TERM UNLOCKED</span></div>
        <div class="passed-card"><div class="passed-icon">✓</div><span class="eyebrow">WELL SEALED</span><h1>${esc(level.term)}</h1><p>${esc(level.definition)}</p><div class="command-box"><span class="eyebrow">KEEP THIS COMMAND</span><code>${esc(level.command)}</code></div></div>
        <div class="transition-bottom"><p>${next ? `Up next: <strong>${esc(next.term)}</strong>` : "You have finished all 17 field notes."}</p><button class="primary-button" data-action="next">${next ? "Next field note" : "Explore the glossary"} <span>↗</span></button></div>
      </div>
      ${graphPanel()}
    </section>`;
}

function glossaryContent(): string {
  const learned = levels.slice(0, unlockedLevelCount());
  return `
    <section class="wide-content">
      <div class="level-kicker"><span>FIELD NOTES</span><span class="kicker-line"></span><span>${learned.length} OF ${levels.length} UNLOCKED</span></div>
      <div class="wide-heading"><div><h1>Glossary</h1><p>Every term is a jar you have opened. Return when you need a quick reminder.</p></div><span class="term-stamp">${String(learned.length).padStart(2, "0")}</span></div>
      <div class="glossary-grid">${learned.map((level, index) => `<article class="glossary-card" style="--term-color:${level.color}">
        <div class="glossary-card-head"><span class="glossary-index">${String(index + 1).padStart(2, "0")}</span><span class="eyebrow">TERM ${String(index + 1).padStart(2, "0")}</span></div>
        <h2>${esc(level.term)}</h2><p>${esc(level.definition)}</p>
        <div class="glossary-metaphor"><span>✳</span>${esc(level.metaphor)}</div>
        <code>${esc(level.command)}</code>
      </article>`).join("")}</div>
      ${graphPanel()}
    </section>`;
}

function sandboxContent(): string {
  return `
    <section class="lesson-content sandbox-page">
      <div class="level-kicker"><span>OPEN WORKSHOP</span><span class="kicker-line"></span><span>NO RULES, JUST FLOWS</span></div>
      <div class="lesson-heading"><div><h1>Sandbox</h1><p>Build your own little Git kitchen. Add jars, route a pipe, and pour to mix.</p></div><span class="term-stamp">∞</span></div>
      <div class="game-layout">
        <div class="play-column">
          <div class="stage-frame">
            <div class="stage-topline"><span>FREE-FORM PLAYGROUND</span><span class="stage-hint"><span class="hint-dot"></span> LIQUID LAB</span></div>
            <canvas class="game-canvas sandbox-canvas" tabindex="0" role="button" aria-label="Sandbox playground. Tap to pour and mix colored liquids."></canvas>
            <div class="stage-instruction"><span class="instruction-icon">↳</span><span>Tap anywhere in the workshop to pour and blend the liquid.</span></div>
          </div>
          <div class="sandbox-actions">
            <button class="utility-button" data-sandbox="jar">＋ Add jar</button><button class="utility-button" data-sandbox="pipe">⌁ Add pipe</button><button class="primary-button" data-sandbox="commit">Seal a commit <span>↗</span></button>
          </div>
          <p class="sandbox-hint">${sandboxJars} jars · ${sandboxPipes} pipes · no saves are required</p>
        </div>
        ${graphPanel()}
      </div>
    </section>`;
}

function render(): void {
  stage?.dispose();
  stage = undefined;
  const noRail = screen === "glossary" || screen === "sandbox";
  const content = screen === "lesson" ? lessonContent()
    : screen === "recap" ? recapContent()
      : screen === "quiz" ? quizContent()
        : screen === "passed" ? passedContent()
          : screen === "glossary" ? glossaryContent()
            : sandboxContent();
  app!.innerHTML = `${navigation()}<div class="app-shell ${noRail ? "no-rail" : ""}">${noRail ? "" : sidebar()}<main class="main-area">${content}</main></div><footer class="site-footer"><span>BRANCHCRAFT <span class="footer-sep">/</span> A LITTLE GIT, HANDS-ON</span><span>MADE OF PIXELS, PARTICLES &amp; PROCEDURAL SOUNDS</span></footer>`;

  const graphCanvas = app!.querySelector<HTMLCanvasElement>(".graph-canvas");
  if (graphCanvas) drawCommitGraph(graphCanvas, progress.graph);

  const gameCanvas = app!.querySelector<HTMLCanvasElement>(".game-canvas");
  if (gameCanvas) {
    stage = new CanvasStage(
      gameCanvas,
      screen === "lesson" ? levels[currentIndex]! : null,
      actionCount,
      () => performAction(),
      screen === "sandbox" ? { jars: sandboxJars, pipes: sandboxPipes } : undefined,
    );
  }
}

function performAction(): void {
  if (screen !== "lesson" || actionCount >= 3) return;
  actionCount += 1;
  recordAction(progress.graph, levels[currentIndex]!);
  persist();
  stage?.setProgress(actionCount);
  const stepLabel = app!.querySelector<HTMLElement>("[data-step-label]");
  if (stepLabel) stepLabel.textContent = `${actionCount} / 3 batches`;
  app!.querySelectorAll<HTMLElement>(".progress-track span").forEach((element, index) => {
    if (index < actionCount) element.classList.add("filled");
  });
  const button = app!.querySelector<HTMLButtonElement>('[data-action="perform"]');
  if (button) {
    if (actionCount === 3) button.disabled = true;
    else button.innerHTML = `${esc(levels[currentIndex]!.action)} <span aria-hidden="true">↗</span>`;
  }
  const graphCanvas = app!.querySelector<HTMLCanvasElement>(".graph-canvas");
  if (graphCanvas) drawCommitGraph(graphCanvas, progress.graph);
  if (actionCount === 3) screen = "recap";
  if (screen === "recap") render();
}

function chooseAnswer(index: number): void {
  if (screen !== "quiz") return;
  const question = levels[currentIndex]!.quiz[quizIndex]!;
  if (index !== question.answer) {
    feedback = `Not quite. ${question.explanation}`;
    render();
    return;
  }
  feedback = "";
  quizIndex += 1;
  if (quizIndex === 3) {
    progress.completed = [...new Set([...progress.completed, currentIndex])];
    progress.unlockedLevel = Math.max(progress.unlockedLevel, Math.min(currentIndex + 1, levels.length - 1));
    persist();
    screen = "passed";
  }
  render();
}

function resetWorkshop(): void {
  if (!window.confirm("Reset your workshop and clear all unlocked field notes?")) return;
  try {
    localStorage.removeItem("branchcraft-save-v1");
  } catch {
    // Reset the in-memory game even if storage is unavailable.
  }
  progress = { unlockedLevel: 0, graph: newGraph(), completed: [] };
  currentIndex = 0;
  actionCount = 0;
  quizIndex = 0;
  screen = "lesson";
  render();
}

app!.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("button");
  if (!target) return;
  if (target.hasAttribute("data-reset")) {
    resetWorkshop();
    return;
  }
  if (target.dataset.level !== undefined) {
    const index = Number(target.dataset.level);
    if (Number.isInteger(index) && index >= 0 && index < levels.length && index <= progress.unlockedLevel) {
      currentIndex = index;
      actionCount = 0;
      quizIndex = 0;
      feedback = "";
      screen = "lesson";
      render();
    }
    return;
  }
  if (target.dataset.screen) {
    const selected = target.dataset.screen as Screen;
    screen = selected;
    if (selected === "lesson") {
      currentIndex = Math.min(currentIndex, progress.unlockedLevel);
      actionCount = 0;
    }
    render();
    return;
  }
  if (target.dataset.action === "perform") {
    performAction();
    return;
  }
  if (target.dataset.action === "start-quiz") {
    quizIndex = 0;
    feedback = "";
    screen = "quiz";
    render();
    return;
  }
  if (target.dataset.action === "next") {
    if (currentIndex < levels.length - 1) currentIndex += 1;
    else screen = "glossary";
    actionCount = 0;
    quizIndex = 0;
    feedback = "";
    screen = screen === "glossary" ? "glossary" : "lesson";
    render();
    return;
  }
  if (target.dataset.answer !== undefined) {
    chooseAnswer(Number(target.dataset.answer));
    return;
  }
  if (target.dataset.sandbox) {
    const action = target.dataset.sandbox as "jar" | "pipe" | "commit";
    if (action === "jar") sandboxJars = Math.min(sandboxJars + 1, 4);
    if (action === "pipe") sandboxPipes = Math.min(sandboxPipes + 1, 5);
    stage?.sandboxAction(action);
    if (action === "commit") {
      recordAction(progress.graph, commitLevel, true);
      persist();
      const graphCanvas = app!.querySelector<HTMLCanvasElement>(".graph-canvas");
      if (graphCanvas) drawCommitGraph(graphCanvas, progress.graph);
    } else {
      const hint = app!.querySelector<HTMLElement>(".sandbox-hint");
      if (hint) hint.textContent = `${sandboxJars} jars · ${sandboxPipes} pipes · no saves are required`;
    }
  }
});

render();
