import { GraphCanvas } from "./engine";
import { headId, matchesGoal, newGraph, operate, type Action, type Graph } from "./graph";
import { levels } from "./levels";
import { loadGame, saveGame } from "./save";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const progress = loadGame(levels.length);
type Screen = "lesson" | "sandbox" | "glossary";
type Entry = { command: string; output: string; ok: boolean };
type Snapshot = { graph: Graph; history: Entry[] };
let screen: Screen = "lesson";
let current = Math.min(progress.unlockedLevel, levels.length - 1);
let lessonGraph = structuredClone(levels[current]!.start);
let sandboxGraph = newGraph();
let selected = headId(lessonGraph);
let history: Entry[] = [];
let sandboxHistory: Entry[] = [];
let undo: Snapshot[] = [];
let redo: Snapshot[] = [];
let canvas: GraphCanvas | undefined;
let quizIndex: number | null = null;
let quizFeedback = "";
let completedGraph = false;

const esc = (value: string): string => value.replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const graph = (): Graph => screen === "sandbox" ? sandboxGraph : lessonGraph;
const log = (): Entry[] => screen === "sandbox" ? sandboxHistory : history;
const actions: [Action, string, string][] = [
  ["init", "Init", "Create a repository"], ["edit", "Edit file", "Edit the working tree (E)"],
  ["stage", "Stage", "Stage the working tree (S)"], ["commit", "Commit", "Commit the index (C)"],
  ["branch", "New branch", "Create a branch at selection (B)"], ["checkout", "Checkout", "Checkout selection (Enter)"],
  ["merge", "Merge selected into HEAD", "Merge selection (M)"], ["rebase", "Rebase HEAD onto selected", "Replay HEAD's commits on selection"],
  ["reset", "Reset to selected", "Mixed reset: move HEAD, unstage, keep working files"],
  ["revert", "Revert selected", "Create an inverse commit"], ["cherry-pick", "Cherry-pick selected", "Apply the selected commit"],
  ["fetch", "Fetch", "Update origin tracking refs"], ["pull", "Pull", "Fetch and merge origin's current branch"],
  ["push", "Push", "Push HEAD's branch to origin"], ["clone", "Clone", "Clone origin into an empty repository"],
  ["stash", "Stash", "Save uncommitted changes"], ["pop", "Pop", "Restore the latest stash"],
  ["tag", "Tag", "Name the selected commit"], ["ignore", "Ignore file", "Add the file path to .gitignore"],
];

function toolbar(): string {
  return `<section class="controls" aria-label="Git actions">
    <div class="inputs">
      <label>Branch / tag / commit message<input id="name" autocomplete="off" placeholder="feature"></label>
      <label>File path<input id="path" value="file.txt" autocomplete="off"></label>
      <label>File contents<input id="contents" placeholder="Your change" autocomplete="off"></label>
    </div>
    <p id="selection">Selected: <strong>${esc(selected || "none")}</strong> · actions target this commit; HEAD is ${esc(headId(graph()) || "unborn")}.</p>
    <div class="toolbar">${actions.map(([action, label, title]) => `<button data-action="${action}" title="${title}">${label}</button>`).join("")}</div>
  </section>`;
}

function render(): void {
  canvas?.dispose();
  canvas = undefined;
  const level = levels[current]!;
  app.innerHTML = `<header><a class="brand" href="#" data-screen="lesson">⑂ branchcraft</a><span>Git is a graph. Make your move.</span>
    <nav aria-label="Main navigation">${(["lesson", "sandbox", "glossary"] as Screen[]).map(item =>
      `<button data-screen="${item}" aria-current="${screen === item ? "page" : "false"}">${item === "lesson" ? "Learn" : item === "sandbox" ? "Sandbox" : "Glossary"}</button>`).join("")}</nav></header>
    <div class="shell"><aside aria-label="Course levels"><h2>17 graph challenges</h2><ol>${levels.map((item, index) =>
      `<li><button data-level="${index}" ${index > progress.unlockedLevel ? "disabled" : ""} class="${current === index && screen === "lesson" ? "active" : ""}"><span>${progress.completed.includes(index) ? "✓" : String(index + 1).padStart(2, "0")}</span> ${esc(item.term)}</button></li>`).join("")}</ol>
      <button id="reset-progress">Reset progress</button></aside><main>
    ${screen === "glossary" ? `<h1>Glossary</h1><p>Terms you have unlocked, grounded in commit history.</p><div class="glossary">${levels.slice(0, progress.unlockedLevel + 1).map(item =>
      `<article><h2>${esc(item.term)}</h2><p>${esc(item.definition)}</p><code>${esc(item.command)}</code></article>`).join("")}</div>` :
    `<div class="heading"><div><p class="eyebrow">${screen === "sandbox" ? "FREE GRAPH · ALL ACTIONS UNLOCKED" : `CHALLENGE ${current + 1} / 17`}</p><h1>${screen === "sandbox" ? "Sandbox" : esc(level.term)}</h1><p>${screen === "sandbox" ? "Experiment with history. Every action uses the same Git rules as the lessons." : esc(level.instruction)}</p></div>
      <div class="level-tools">${screen === "lesson" ? '<button id="reset-level">Reset level</button><button id="hint">Hint</button>' : '<button id="undo">Undo</button><button id="redo">Redo</button><button id="export">Export history</button><button id="clear-sandbox">New graph</button><button id="empty-sandbox">Empty directory</button>'}</div></div>
    <p id="notice" role="status" aria-live="polite"></p>
    <div class="status" id="status"></div>
    <div id="graph-host" class="graph-host"></div>
    <p class="graph-help">Click a commit to select · click a branch to checkout · arrows navigate commits · Enter checks out · dashed outline = goal</p>
    <details class="file-inspector"><summary>Inspect working files and index</summary><div id="files"></div></details>
    ${toolbar()}
    <section class="terminal" aria-label="Live Git terminal" tabindex="0"><h2>Command history</h2><div id="terminal" role="log" aria-live="polite"></div></section>
    <section id="completion" aria-live="polite"></section>`}
    </main></div><footer>Branchcraft · a local Git simulator · no commands run on your computer</footer>`;
  if (screen !== "glossary") {
    canvas = new GraphCanvas(app.querySelector<HTMLElement>("#graph-host")!, graph(), screen === "lesson" ? level.goal : undefined,
      id => { selected = id; update(); },
      ref => act("checkout", ref));
    update();
  }
}

function update(): void {
  if (screen === "glossary") return;
  const state = graph();
  canvas?.update(state, selected);
  app.querySelector("#selection")!.innerHTML = `Selected: <strong>${esc(selected || "none")}</strong> · HEAD: ${esc("branch" in state.head ? state.head.branch : "detached")} @ ${esc(headId(state) || "unborn")}`;
  app.querySelector("#status")!.textContent = `${state.initialized ? "Repository ready" : "No local repository"} · Working tree: ${state.dirty ? "modified" : "clean"} · Index: ${state.staged ? "staged" : "empty"} · Stashes: ${state.stash.length}${state.conflict ? ` · CONFLICT: ${state.conflict.kind} — edit file, stage, then commit` : ""}`;
  app.querySelector("#files")!.innerHTML = `<div><h3>Working tree</h3>${Object.entries(state.working).map(([path, content]) =>
    `<h4>${esc(path)}</h4><pre>${esc(content)}</pre>`).join("") || "<p>No files</p>"}</div><div><h3>Index snapshot</h3>${Object.entries(state.index).map(([path, content]) =>
    `<h4>${esc(path)}</h4><pre>${esc(content)}</pre>`).join("") || "<p>No files</p>"}</div>`;
  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(button => {
    const action = button.dataset.action!;
    const targetsSelection = ["branch", "checkout", "merge", "rebase", "reset", "revert", "cherry-pick", "tag"].includes(action);
    button.setAttribute("aria-description", targetsSelection ? `Target: ${selected || "no commit selected"}. HEAD: ${headId(state) || "unborn"}.` : `Working on ${"branch" in state.head ? state.head.branch : "detached HEAD"}.`);
    button.classList.toggle("suggested", state.conflict ? ["edit", "stage", "commit"].includes(action) :
      state.staged ? action === "commit" : state.dirty ? action === "stage" : targetsSelection && !!selected);
  });
  const terminal = app.querySelector("#terminal")!;
  terminal.innerHTML = log().length ? log().map(entry => `<div class="${entry.ok ? "" : "error"}"><code>$ ${esc(entry.command)}</code><pre>${esc(entry.output)}</pre></div>`).join("") : '<p>Choose an action to see its equivalent Git command.</p>';
  terminal.scrollTop = terminal.scrollHeight;
  if (screen === "sandbox") {
    (app.querySelector("#undo") as HTMLButtonElement).disabled = !undo.length;
    (app.querySelector("#redo") as HTMLButtonElement).disabled = !redo.length;
  } else {
    completedGraph = matchesGoal(lessonGraph, levels[current]!.goal);
    if (!completedGraph) { quizIndex = null; quizFeedback = ""; }
    renderCompletion();
  }
}

function renderCompletion(): void {
  const container = app.querySelector("#completion")!;
  if (!completedGraph) { container.innerHTML = ""; return; }
  if (quizIndex === null) {
    container.innerHTML = '<div class="success"><h2>Graph matched!</h2><p>Your topology, branches, HEAD, and remote refs match the goal.</p><button id="start-quiz">Check your graph: 3 questions</button></div>';
    return;
  }
  if (quizIndex >= 3) {
    container.innerHTML = `<div class="success"><h2>Challenge complete</h2><p>${esc(levels[current]!.definition)}</p><button id="next">${current + 1 < levels.length ? "Next challenge" : "Open glossary"}</button></div>`;
    return;
  }
  const question = levels[current]!.quiz[quizIndex]!;
  container.innerHTML = `<div class="quiz"><p class="eyebrow">YOUR GRAPH · QUESTION ${quizIndex + 1} / 3</p><h2>${esc(question.prompt)}</h2><div class="answers">${question.options.map((option, index) => `<button data-answer="${index}">${esc(option)}</button>`).join("")}</div><p role="status">${esc(quizFeedback)}</p>${quizFeedback.startsWith("Correct") ? '<button id="quiz-next">Continue</button>' : ""}</div>`;
}

function notice(message: string): void { app.querySelector("#notice")!.textContent = message; }

function act(action: Action, checkoutTarget?: string): void {
  if (screen === "glossary") return;
  const name = app.querySelector<HTMLInputElement>("#name")!.value.trim();
  const path = app.querySelector<HTMLInputElement>("#path")!.value.trim() || "file.txt";
  const contents = app.querySelector<HTMLInputElement>("#contents")!.value;
  const selectedAction = ["branch", "tag", "checkout", "merge", "rebase", "reset", "revert", "cherry-pick"].includes(action);
  const target = action === "edit" || action === "ignore" ? path : selectedAction ? checkoutTarget ?? (selected || undefined) : undefined;
  const state = graph();
  const result = operate(state, action, target, action === "edit" ? contents : name || undefined);
  if (screen === "sandbox") {
    undo.push({ graph: structuredClone(state), history: structuredClone(sandboxHistory) }); redo = [];
    sandboxGraph = result.graph;
    sandboxHistory.push({ command: result.command, output: result.output, ok: result.ok });
  } else {
    lessonGraph = result.graph;
    history.push({ command: result.command, output: result.output, ok: result.ok });
  }
  if (result.ok && ["commit", "clone", "init", "checkout", "rebase", "cherry-pick", "revert", "pull", "merge"].includes(action)) selected = headId(result.graph);
  notice(result.output);
  update();
  if (!result.ok) canvas?.reject();
}

function openLevel(index: number): void {
  current = index;
  screen = "lesson";
  lessonGraph = structuredClone(levels[index]!.start);
  selected = headId(lessonGraph);
  history = [];
  quizIndex = null;
  quizFeedback = "";
  render();
}

app.addEventListener("click", event => {
  const button = (event.target as Element).closest<HTMLElement>("button, a[data-screen]");
  if (!button) return;
  if (button.dataset.screen) {
    event.preventDefault();
    screen = button.dataset.screen as Screen;
    selected = headId(graph());
    render();
  } else if (button.dataset.level !== undefined) {
    const index = Number(button.dataset.level);
    if (index <= progress.unlockedLevel) openLevel(index);
  } else if (button.dataset.action) act(button.dataset.action as Action);
  else if (button.dataset.answer !== undefined && quizIndex !== null && quizIndex < 3) {
    if (quizFeedback.startsWith("Correct")) return;
    const question = levels[current]!.quiz[quizIndex]!;
    quizFeedback = Number(button.dataset.answer) === question.answer ? `Correct. ${question.explanation}` : "Not quite — look at the graph and try again.";
    renderCompletion();
  } else switch (button.id) {
    case "reset-level": openLevel(current); break;
    case "hint": notice(levels[current]!.hint); break;
    case "start-quiz": quizIndex = 0; quizFeedback = ""; renderCompletion(); break;
    case "quiz-next":
      if (quizIndex === null) break;
      quizIndex++; quizFeedback = "";
      if (quizIndex === 3) {
        if (!progress.completed.includes(current)) progress.completed.push(current);
        progress.unlockedLevel = Math.min(levels.length - 1, Math.max(progress.unlockedLevel, current + 1));
        saveGame(progress);
      }
      renderCompletion(); break;
    case "next":
      if (current + 1 < levels.length) openLevel(current + 1);
      else { screen = "glossary"; render(); }
      break;
    case "undo": case "redo": {
      const source = button.id === "undo" ? undo : redo;
      const destination = button.id === "undo" ? redo : undo;
      const snapshot = source.pop();
      if (snapshot) {
        destination.push({ graph: structuredClone(sandboxGraph), history: structuredClone(sandboxHistory) });
        sandboxGraph = snapshot.graph; sandboxHistory = snapshot.history; selected = headId(sandboxGraph); update();
      }
      break;
    }
    case "export": {
      const blob = new Blob([sandboxHistory.map(entry => `$ ${entry.command}\n${entry.output}`).join("\n\n") + "\n"], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "branchcraft-history.txt"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); break;
    }
    case "clear-sandbox": case "empty-sandbox": {
      undo.push({ graph: structuredClone(sandboxGraph), history: structuredClone(sandboxHistory) });
      const origin = structuredClone(sandboxGraph.origin);
      redo = []; sandboxGraph = newGraph();
      if (button.id === "empty-sandbox") sandboxGraph = { ...sandboxGraph, initialized: false, commits: [], branches: {}, tracking: {}, origin };
      sandboxHistory = []; selected = headId(sandboxGraph); update(); break;
    }
    case "reset-progress":
      if (confirm("Reset all course progress?")) { progress.unlockedLevel = 0; progress.completed = []; saveGame(progress); openLevel(0); }
      break;
  }
});

document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || screen === "glossary") return;
  const shortcuts: Record<string, Action> = { e: "edit", s: "stage", c: "commit", b: "branch", m: "merge" };
  const action = shortcuts[event.key.toLowerCase()];
  if (action) { event.preventDefault(); act(action); }
});

render();
