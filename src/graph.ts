/** A small, deterministic, in-memory Git model. No operation mutates its input. */
export interface Commit {
  id: string;
  parents: string[];
  message: string;
  tree: Record<string, string>;
}

export interface Graph {
  commits: Commit[];
  branches: Record<string, string>;
  head: { branch: string } | { commit: string };
  dirty: boolean;
  staged: boolean;
  working: Record<string, string>;
  index: Record<string, string>;
  origin: { branches: Record<string, string>; commits: Commit[] };
  tracking: Record<string, string>;
  tags: Record<string, string>;
  stash: Array<{
    working: Record<string, string>;
    index: Record<string, string>;
    dirty: boolean;
    staged: boolean;
  }>;
  conflict: null | {
    kind: "merge" | "rebase" | "cherry-pick" | "revert";
    target: string;
  };
  initialized: boolean;
}

export type Action =
  | "init" | "edit" | "stage" | "commit" | "branch" | "checkout"
  | "merge" | "rebase" | "reset" | "revert" | "cherry-pick"
  | "fetch" | "pull" | "push" | "clone" | "stash" | "pop" | "tag" | "ignore";

type Tree = Record<string, string>;
type Result = { graph: Graph; command: string; output: string; ok: boolean };

const own = (object: object, key: string) => Object.hasOwn(object, key);
const copyCommit = (commit: Commit): Commit => ({
  ...commit, parents: [...commit.parents], tree: { ...commit.tree },
});

export function cloneGraph(g: Graph): Graph {
  return {
    commits: g.commits.map(copyCommit),
    branches: { ...g.branches },
    head: { ...g.head },
    dirty: g.dirty,
    staged: g.staged,
    working: { ...g.working },
    index: { ...g.index },
    origin: {
      branches: { ...g.origin.branches },
      commits: g.origin.commits.map(copyCommit),
    },
    tracking: { ...g.tracking },
    tags: { ...g.tags },
    stash: g.stash.map((entry) => ({
      ...entry, working: { ...entry.working }, index: { ...entry.index },
    })),
    conflict: g.conflict && { ...g.conflict },
    initialized: g.initialized,
  };
}

export function newGraph(): Graph {
  return {
    commits: [{ id: "c0", parents: [], message: "Initial commit", tree: {} }],
    branches: { main: "c0" },
    head: { branch: "main" },
    dirty: false,
    staged: false,
    working: {},
    index: {},
    origin: { branches: {}, commits: [] },
    tracking: {},
    tags: {},
    stash: [],
    conflict: null,
    initialized: true,
  };
}

export function headId(g: Graph): string {
  return "branch" in g.head
    ? (own(g.branches, g.head.branch) ? g.branches[g.head.branch] : "")
    : g.head.commit;
}

function find(g: Graph, id: string): Commit | undefined {
  return g.commits.find((commit) => commit.id === id);
}

function headTree(g: Graph): Tree {
  return find(g, headId(g))?.tree ?? {};
}

function equalTree(a: Tree, b: Tree): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length
    && keys.every((key) => own(b, key) && a[key] === b[key]);
}

function resolve(g: Graph, ref = "HEAD"): string | undefined {
  const expression = /^(.*?)([~^])(\d*)$/.exec(ref);
  if (expression) {
    let id = resolve(g, expression[1] || "HEAD");
    const count = expression[3] === "" ? 1 : Number(expression[3]);
    if (!Number.isSafeInteger(count)) return undefined;
    if (expression[2] === "^") {
      return count === 0 ? id : (id && find(g, id)?.parents[count - 1]) || undefined;
    }
    for (let i = 0; i < count && id; i++) id = find(g, id)?.parents[0];
    return id;
  }
  const id = ref === "HEAD" ? headId(g)
    : own(g.branches, ref) ? g.branches[ref]
    : own(g.tags, ref) ? g.tags[ref]
    : own(g.tracking, ref) ? g.tracking[ref]
    : ref;
  return find(g, id) ? id : undefined;
}

function ancestors(g: Graph, id: string): Set<string> {
  const result = new Set<string>();
  const pending = [id];
  while (pending.length) {
    const next = pending.pop()!;
    if (result.has(next)) continue;
    result.add(next);
    pending.push(...(find(g, next)?.parents ?? []));
  }
  return result;
}

function isAncestor(g: Graph, ancestor: string, descendant: string): boolean {
  return ancestors(g, descendant).has(ancestor);
}

function mergeBase(g: Graph, a: string, b: string): string | undefined {
  const common = [...ancestors(g, a)].filter((id) => isAncestor(g, id, b));
  // Refuse ambiguous criss-cross bases rather than silently merging incorrectly.
  const best = common.filter((id) => !common.some(
    (other) => other !== id && isAncestor(g, id, other),
  ));
  return best.length === 1 ? best[0] : undefined;
}

function moveHead(g: Graph, id: string): void {
  if ("branch" in g.head) g.branches = { ...g.branches, [g.head.branch]: id };
  else g.head = { commit: id };
}

function nextId(g: Graph): string {
  const ids = new Set([...g.commits, ...g.origin.commits].map((c) => c.id));
  let n = 0;
  while (ids.has(`c${n}`)) n++;
  return `c${n}`;
}

function addCommit(g: Graph, tree: Tree, message: string, parents = [headId(g)]): Commit {
  const commit: Commit = { id: nextId(g), parents, message, tree: { ...tree } };
  g.commits.push(commit);
  moveHead(g, commit.id);
  return commit;
}

function stashBase(g: Graph, entry: Graph["stash"][number]): Tree | undefined {
  // Like Git, stash keeps its base and index in otherwise unreachable commits.
  // This stores all state in the public Graph without hidden mutable metadata.
  let matched: Tree | undefined;
  for (let i = g.commits.length - 1; i >= 0; i--) {
    const snapshot = g.commits[i];
    if (snapshot.message !== "Stash working directory" || snapshot.parents.length !== 2
      || !equalTree(snapshot.tree, entry.working)) continue;
    const index = find(g, snapshot.parents[1]);
    const base = find(g, snapshot.parents[0]);
    if (base && index?.message === "Stash index" && index.parents.length === 1
      && index.parents[0] === base.id && equalTree(index.tree, entry.index)
      && !equalTree(base.tree, entry.index) === entry.staged) {
      if (matched && !equalTree(matched, base.tree)) return undefined;
      matched = base.tree;
    }
  }
  if (matched) return matched;
  // A caller may construct stash entries directly. An unstaged-only snapshot's
  // index is its base; staged snapshots without their objects are ambiguous.
  return entry.staged ? undefined : entry.index;
}

function globExpression(pattern: string): string {
  let result = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*" && pattern[i + 1] === "*") {
      i++;
      if (pattern[i + 1] === "/") { result += "(?:.*/)?"; i++; }
      else result += ".*";
    } else if (char === "*") result += "[^/]*";
    else if (char === "?") result += "[^/]";
    else result += char.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
  }
  return result;
}

function ignored(g: Graph, path: string): boolean {
  // Git ignores only untracked files, never an already tracked path.
  if (own(g.index, path) || own(headTree(g), path) || path === ".gitignore") return false;
  let matches = false;
  for (let rule of (g.working[".gitignore"] ?? "").split(/\r?\n/)) {
    if (!rule || rule.startsWith("#")) continue;
    const negated = rule.startsWith("!");
    if (negated) rule = rule.slice(1);
    if (!rule) continue;
    const anchored = rule.startsWith("/");
    if (anchored) rule = rule.slice(1);
    const directory = rule.endsWith("/");
    if (directory) rule = rule.slice(0, -1);
    const prefix = anchored || rule.includes("/") ? "^" : "(?:^|/)";
    const suffix = directory ? "/" : "(?:$|/)";
    if (new RegExp(prefix + globExpression(rule) + suffix).test(path)) matches = !negated;
  }
  return matches;
}

function status(g: Graph): void {
  const visible = Object.fromEntries(Object.entries(g.working).filter(([path]) => !ignored(g, path)));
  // dirty is the unstaged delta; staged is the index-to-HEAD delta.
  g.dirty = !equalTree(visible, g.index);
  g.staged = !equalTree(g.index, headTree(g));
}

function clean(g: Graph): boolean {
  status(g);
  return !g.dirty && !g.staged;
}

function setTree(g: Graph, tree: Tree): void {
  // Preserve ignored untracked files across checkout/reset/merge.
  const untracked = Object.fromEntries(Object.entries(g.working).filter(
    ([path]) => ignored(g, path) && !own(tree, path),
  ));
  g.working = { ...untracked, ...tree };
  g.index = { ...tree };
  status(g);
}

function conflictWorking(g: Graph, tree: Tree): void {
  const untracked = Object.fromEntries(Object.entries(g.working).filter(([path]) => ignored(g, path)));
  g.working = { ...untracked, ...tree };
}

type TextEdit = { start: number; end: number; lines: string[] };

function textEdits(base: string[], changed: string[]): TextEdit[] {
  const lengths = Array.from({ length: base.length + 1 }, () => new Uint32Array(changed.length + 1));
  for (let a = base.length - 1; a >= 0; a--) {
    for (let b = changed.length - 1; b >= 0; b--) {
      lengths[a][b] = base[a] === changed[b]
        ? lengths[a + 1][b + 1] + 1 : Math.max(lengths[a + 1][b], lengths[a][b + 1]);
    }
  }
  const edits: TextEdit[] = [];
  let a = 0;
  let b = 0;
  while (a < base.length || b < changed.length) {
    if (a < base.length && b < changed.length && base[a] === changed[b]) { a++; b++; continue; }
    const edit: TextEdit = { start: a, end: a, lines: [] };
    while (a < base.length || b < changed.length) {
      if (a < base.length && b < changed.length && base[a] === changed[b]) break;
      if (b < changed.length && (a === base.length || lengths[a][b + 1] >= lengths[a + 1][b])) {
        edit.lines.push(changed[b++]);
      } else a++;
    }
    edit.end = a;
    edits.push(edit);
  }
  return edits;
}

function mergeText(base: string, ours: string, theirs: string): string | undefined {
  if ([base, ours, theirs].some((text) => text.includes("\0"))) return undefined;
  const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const original = lines(base);
  const oursLines = lines(ours);
  const theirsLines = lines(theirs);
  // Bound the educational simulator's diff memory use for very large files.
  if (Math.max(original.length, oursLines.length, theirsLines.length) > 10_000
    || original.length * Math.max(oursLines.length, theirsLines.length) > 1_000_000) return undefined;
  const a = textEdits(original, oursLines);
  const b = textEdits(original, theirsLines);
  const combined = [...a];
  for (const right of b) {
    let duplicate = false;
    for (const left of a) {
      if (left.start === right.start && left.end === right.end
        && left.lines.join("") === right.lines.join("")) { duplicate = true; break; }
      const overlap = left.start < right.end && right.start < left.end;
      const insertionConflict = (left.start === left.end && left.start >= right.start && left.start <= right.end)
        || (right.start === right.end && right.start >= left.start && right.start <= left.end);
      if (overlap || insertionConflict) return undefined;
    }
    if (!duplicate) combined.push(right);
  }
  combined.sort((left, right) => left.start - right.start);
  const merged: string[] = [];
  let position = 0;
  for (const edit of combined) {
    merged.push(...original.slice(position, edit.start), ...edit.lines);
    position = edit.end;
  }
  merged.push(...original.slice(position));
  return merged.join("");
}

function combine(base: Tree, ours: Tree, theirs: Tree): { tree: Tree; conflicts: string[] } {
  const tree: Tree = {};
  const conflicts: string[] = [];
  for (const path of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
    const b = own(base, path) ? base[path] : undefined;
    const o = own(ours, path) ? ours[path] : undefined;
    const t = own(theirs, path) ? theirs[path] : undefined;
    let value: string | undefined;
    if (o === t || t === b) value = o;
    else if (o === b) value = t;
    else {
      value = b !== undefined && o !== undefined && t !== undefined ? mergeText(b, o, t) : undefined;
      if (value === undefined) {
        conflicts.push(path);
        value = `<<<<<<< HEAD\n${o ?? ""}\n=======\n${t ?? ""}\n>>>>>>> incoming\n`;
      }
    }
    if (value !== undefined) Object.defineProperty(tree, path, {
      value, enumerable: true, configurable: true, writable: true,
    });
  }
  return { tree, conflicts };
}

function validName(name: string): boolean {
  return !!name && name !== "HEAD" && name !== "@" && !name.startsWith("-")
    && !/[ ~^:?*[\]\\\x00-\x20\x7f]/.test(name)
    && !name.includes("..") && !name.includes("@{")
    && name.split("/").every((part) => !!part && !part.startsWith(".")
      && !part.endsWith(".") && !part.endsWith(".lock"));
}

const quote = (text: string) => /^[\w./@~-]+$/.test(text) ? text : `'${text.replace(/'/g, "'\\''")}'`;

function commandFor(action: Action, target?: string, name?: string): string {
  switch (action) {
    case "edit": return `edit ${quote(target ?? "file.txt")}`;
    case "stage": return `git add ${quote(target ?? ".")}`;
    case "commit": return `git commit -m ${quote(name ?? "Commit")}`;
    case "branch": case "tag":
      return `git ${action} ${quote(name ?? (action === "branch" ? "feature" : "v1.0"))}${target ? ` ${quote(target)}` : ""}`;
    case "reset": return `git reset --mixed ${quote(target ?? "HEAD~1")}`;
    case "checkout": return `git checkout ${quote(target ?? "main")}`;
    case "merge": case "rebase": return `git ${action} ${quote(target ?? "main")}`;
    case "cherry-pick": case "revert": return `git ${action} ${quote(target ?? "HEAD")}`;
    case "fetch": return "git fetch origin";
    case "pull": case "push": return `git ${action} origin${target ? ` ${quote(target)}` : ""}`;
    case "clone": return "git clone origin";
    case "stash": return "git stash";
    case "pop": return "git stash pop --index";
    case "ignore": return `edit .gitignore (${quote(target ?? "*.log")})`;
    default: return "git init";
  }
}

/** init deliberately approximates Git's unborn branch with the empty root c0. */
export function operate(graph: Graph, action: Action, target?: string, name?: string): Result {
  const command = commandFor(action, target, name);
  const g = cloneGraph(graph);
  const result = (output: string, ok = true): Result => ({ graph: g, command, output, ok });
  const fail = (output: string): Result => ({
    graph: cloneGraph(graph), command, output, ok: false,
  });
  if (action === "init") {
    if (g.initialized) return result("Reinitialized existing repository.");
    if (g.commits.length || Object.keys(g.branches).length) return fail("Cannot initialize a nonempty repository.");
    const fresh = newGraph();
    fresh.working = { ...g.working };
    fresh.origin = g.origin;
    status(fresh);
    return { graph: fresh, command, output: "Initialized repository (empty root c0 represents an unborn branch).", ok: true };
  }
  if (action === "clone") {
    if (g.initialized || g.commits.length || Object.keys(g.branches).length
      || Object.keys(g.working).length || Object.keys(g.index).length
      || Object.keys(g.tags).length || Object.keys(g.tracking).length
      || g.stash.length || g.conflict || g.dirty || g.staged) {
      return fail("Clone requires an uninitialized, empty repository.");
    }
    if (!Object.keys(g.origin.branches).length) return fail("Origin has no branches to clone.");
    const error = fetchOrigin(g);
    if (error) return fail(error);
    const branch = own(g.origin.branches, "main") ? "main" : Object.keys(g.origin.branches).sort()[0];
    g.branches = { [branch]: g.origin.branches[branch] };
    g.head = { branch };
    g.initialized = true;
    setTree(g, headTree(g));
    return result(`Cloned origin; checked out ${branch}.`);
  }
  if (!g.initialized) return fail("Not a Git repository. Run git init or git clone first.");
  if (!find(g, headId(g))) return fail("HEAD does not reference a local commit.");
  if (g.conflict && !["edit", "stage", "commit"].includes(action)) {
    return fail(`Resolve the ${g.conflict.kind} conflict with edit, stage, and commit first.`);
  }

  switch (action) {
    case "edit": {
      const path = target ?? "file.txt";
      if (!path || path === "." || path.startsWith("/") || path.split("/").some(
        (part) => !part || part === "." || part === ".." || part === ".git",
      )) return fail("Invalid file path.");
      if (Object.keys(g.working).some((existing) => existing !== path
        && (existing.startsWith(`${path}/`) || path.startsWith(`${existing}/`)))) {
        return fail("A file and directory cannot occupy the same path.");
      }
      const contents = name ?? `${path}: edit ${own(g.working, path) ? g.working[path].length + 1 : 1}`;
      g.working = { ...g.working, [path]: contents };
      status(g);
      return result(ignored(g, path) ? `Edited ignored file ${path}.` : `Edited ${path}.`);
    }
    case "ignore": {
      const pattern = target ?? "*.log";
      if (!pattern || pattern.includes("\n") || pattern.includes("\r")) return fail("Supply one nonempty ignore pattern.");
      const old = g.working[".gitignore"] ?? "";
      g.working[".gitignore"] = old + (old && !old.endsWith("\n") ? "\n" : "") + pattern + "\n";
      status(g);
      return result(`Added ${pattern} to .gitignore.`);
    }
    case "stage": {
      if (target && target !== ".") {
        if (!own(g.working, target) && !own(g.index, target)) return fail(`Path not found: ${target}.`);
        if (ignored(g, target)) return fail(`Path is ignored: ${target}.`);
        if (own(g.working, target)) g.index = { ...g.index, [target]: g.working[target] };
        else delete g.index[target];
      } else {
        g.index = Object.fromEntries(Object.entries(g.working).filter(([path]) => !ignored(g, path)));
      }
      status(g);
      return result("Changes staged.");
    }
    case "commit": {
      status(g);
      if (g.conflict) {
        if (g.dirty || Object.values(g.index).some(
          (text) => /^(<<<<<<< |=======|>>>>>>> )/m.test(text),
        )) return fail("Resolve all conflict markers and stage the resolution before committing.");
      } else if (!g.staged) return fail("Nothing staged to commit.");
      const parents = g.conflict?.kind === "merge"
        ? [headId(g), g.conflict.target] : [headId(g)];
      const commit = addCommit(g, g.index, name ?? "Commit", parents);
      g.conflict = null;
      status(g);
      return result(`Created commit ${commit.id}.`);
    }
    case "branch": case "tag": {
      const ref = name ?? (action === "branch" ? "feature" : "v1.0");
      const refs = action === "branch" ? g.branches : g.tags;
      if (!validName(ref)) return fail(`Invalid ${action} name: ${ref}.`);
      if (own(refs, ref) || Object.keys(refs).some((key) => key.startsWith(`${ref}/`) || ref.startsWith(`${key}/`))) {
        return fail(`${action} already exists or conflicts with an existing ref: ${ref}.`);
      }
      const id = resolve(g, target);
      if (!id) return fail(`Unknown revision: ${target}.`);
      if (action === "branch") g.branches = { ...g.branches, [ref]: id };
      else g.tags = { ...g.tags, [ref]: id };
      return result(`Created ${action} ${ref} at ${id}.`);
    }
    case "checkout": {
      const ref = target ?? "main";
      const id = resolve(g, ref);
      if (!id) return fail(`Unknown revision: ${ref}.`);
      if (!clean(g)) return fail("Commit or stash your changes before checkout.");
      const tree = find(g, id)!.tree;
      setTree(g, tree);
      g.head = own(g.branches, ref) ? { branch: ref } : { commit: id };
      status(g);
      return result("branch" in g.head ? `Switched to branch ${ref}.` : `HEAD detached at ${id}.`);
    }
    case "reset": {
      const id = resolve(g, target ?? "HEAD~1");
      if (!id) return fail(`Unknown revision: ${target ?? "HEAD~1"}.`);
      moveHead(g, id);
      g.index = { ...headTree(g) };
      status(g);
      return result(`HEAD reset to ${id}; working files preserved and index unstaged.`);
    }
    case "merge": {
      const id = resolve(g, target ?? "main");
      if (!id) return fail(`Unknown revision: ${target ?? "main"}.`);
      if (!clean(g)) return fail("Commit or stash your changes before merging.");
      return mergeInto(g, id, result, fail);
    }
    case "rebase": {
      const onto = resolve(g, target ?? "main");
      if (!onto) return fail(`Unknown revision: ${target ?? "main"}.`);
      if (!clean(g)) return fail("Commit or stash your changes before rebasing.");
      const current = headId(g);
      if (isAncestor(g, onto, current)) return result("Already up to date.");
      if (isAncestor(g, current, onto)) {
        setTree(g, find(g, onto)!.tree);
        moveHead(g, onto);
        status(g);
        return result(`Fast-forwarded to ${onto}.`);
      }
      const base = mergeBase(g, current, onto);
      if (!base) return fail("Cannot rebase unrelated histories or ambiguous merge bases.");
      const excluded = ancestors(g, onto);
      const chain: Commit[] = [];
      let cursor: string | undefined = current;
      while (cursor && !excluded.has(cursor)) {
        const commit = find(g, cursor)!;
        if (commit.parents.length !== 1) return fail("Cannot rebase merge commits; history was left unchanged.");
        chain.unshift(commit);
        cursor = commit.parents[0];
      }
      moveHead(g, onto);
      setTree(g, find(g, onto)!.tree);
      for (const commit of chain) {
        const patch = combine(find(g, commit.parents[0])!.tree, headTree(g), commit.tree);
        if (patch.conflicts.length) return fail(`Rebase conflict in ${patch.conflicts.join(", ")}; history was left unchanged.`);
        addCommit(g, patch.tree, commit.message);
        setTree(g, patch.tree);
      }
      return result(`Rebased ${chain.length} commit(s) onto ${onto}.`);
    }
    case "cherry-pick": case "revert": {
      const id = resolve(g, target ?? "HEAD");
      if (!id) return fail(`Unknown revision: ${target ?? "HEAD"}.`);
      if (!clean(g)) return fail("Commit or stash your changes before applying a patch.");
      const commit = find(g, id)!;
      if (commit.parents.length > 1) return fail("A merge commit requires a mainline parent; operation unchanged.");
      const parent = commit.parents[0] ? find(g, commit.parents[0])!.tree : {};
      const patch = action === "cherry-pick"
        ? combine(parent, headTree(g), commit.tree)
        : combine(commit.tree, headTree(g), parent);
      if (patch.conflicts.length) {
        conflictWorking(g, patch.tree);
        g.conflict = { kind: action, target: id };
        status(g);
        return result(`${action} conflict in ${patch.conflicts.join(", ")}. Edit, stage, and commit the resolution.`, false);
      }
      if (equalTree(patch.tree, headTree(g))) return fail("Patch is empty; nothing to commit.");
      const created = addCommit(g, patch.tree, name ?? (action === "revert" ? `Revert "${commit.message}"` : commit.message));
      setTree(g, patch.tree);
      return result(`Created ${created.id} by ${action}.`);
    }
    case "fetch": {
      const error = fetchOrigin(g);
      return error ? fail(error) : result("Fetched origin objects and updated remote-tracking refs.");
    }
    case "pull": {
      if (!clean(g)) return fail("Commit or stash your changes before pulling.");
      const branch = target ?? ("branch" in g.head ? g.head.branch : undefined);
      if (!branch) return fail("Detached HEAD: specify a remote branch to pull.");
      if (!own(g.origin.branches, branch)) return fail(`Remote branch not found: ${branch}.`);
      const error = fetchOrigin(g);
      if (error) return fail(error);
      return mergeInto(g, g.origin.branches[branch], result, fail);
    }
    case "push": {
      const branch = target ?? ("branch" in g.head ? g.head.branch : undefined);
      if (!branch || !validName(branch)) return fail("Specify a valid remote branch when pushing detached HEAD.");
      if (Object.keys(g.origin.branches).some(
        (key) => key.startsWith(`${branch}/`) || branch.startsWith(`${key}/`),
      )) return fail(`Remote branch conflicts with an existing ref: ${branch}.`);
      const local = target && own(g.branches, target) ? g.branches[target] : headId(g);
      const remote = own(g.origin.branches, branch) ? g.origin.branches[branch] : undefined;
      const combined = cloneGraph(g);
      const error = fetchOrigin(combined);
      if (error) return fail(error);
      if (remote && !isAncestor(combined, remote, local)) {
        return fail("Push rejected (non-fast-forward). Fetch and integrate origin first.");
      }
      const reachable = ancestors(g, local);
      const known = new Set(g.origin.commits.map((commit) => commit.id));
      for (const commit of g.commits) {
        if (reachable.has(commit.id) && !known.has(commit.id)) g.origin.commits.push(copyCommit(commit));
      }
      g.origin.branches = { ...g.origin.branches, [branch]: local };
      g.tracking = { ...g.tracking, [`origin/${branch}`]: local };
      return result(`Pushed ${branch} to origin.`);
    }
    case "stash": {
      if (clean(g)) return fail("No local changes to stash.");
      const working = Object.fromEntries(Object.entries(g.working).filter(([path]) => !ignored(g, path)));
      const entry = { working, index: { ...g.index }, dirty: g.dirty, staged: g.staged };
      const base = headId(g);
      const index: Commit = { id: nextId(g), parents: [base], message: "Stash index", tree: { ...g.index } };
      g.commits.push(index);
      g.commits.push({
        id: nextId(g), parents: [base, index.id], message: "Stash working directory", tree: { ...working },
      });
      g.stash.push(entry);
      setTree(g, headTree(g));
      return result("Saved working directory and index to stash.");
    }
    case "pop": {
      if (!g.stash.length) return fail("No stash entries.");
      if (!clean(g)) return fail("Commit or stash current changes before popping.");
      const entry = g.stash[g.stash.length - 1];
      const base = stashBase(g, entry);
      if (!base) return fail("Stash base objects are missing or ambiguous; stash was kept.");
      const working = combine(base, headTree(g), entry.working);
      const index = combine(base, headTree(g), entry.index);
      if (working.conflicts.length || index.conflicts.length) {
        return fail("Stash conflicts with current HEAD; working files are unchanged and stash was kept.");
      }
      const untracked = Object.fromEntries(Object.entries(g.working).filter(([path]) => ignored(g, path)));
      g.working = { ...untracked, ...working.tree };
      g.index = index.tree;
      g.stash.pop();
      status(g);
      return result("Restored stashed working directory and index.");
    }
    default:
      return fail(`Unsupported action: ${action}.`);
  }
}

function mergeInto(
  g: Graph,
  target: string,
  result: (output: string, ok?: boolean) => Result,
  fail: (output: string) => Result,
): Result {
  const current = headId(g);
  if (isAncestor(g, target, current)) return result("Already up to date.");
  if (isAncestor(g, current, target)) {
    setTree(g, find(g, target)!.tree);
    moveHead(g, target);
    status(g);
    return result(`Fast-forwarded to ${target}.`);
  }
  const base = mergeBase(g, current, target);
  if (!base) return fail("Cannot merge unrelated histories or ambiguous merge bases.");
  const patch = combine(find(g, base)!.tree, headTree(g), find(g, target)!.tree);
  if (patch.conflicts.length) {
    conflictWorking(g, patch.tree);
    g.conflict = { kind: "merge", target };
    status(g);
    return result(`Merge conflict in ${patch.conflicts.join(", ")}. Edit, stage, and commit the resolution.`, false);
  }
  const commit = addCommit(g, patch.tree, "Merge", [current, target]);
  setTree(g, patch.tree);
  return result(`Merged as ${commit.id}.`);
}

function fetchOrigin(g: Graph): string | undefined {
  const remote = new Map(g.origin.commits.map((commit) => [commit.id, commit]));
  if (remote.size !== g.origin.commits.length) return "Origin contains duplicate object IDs.";
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const validate = (id: string): boolean => {
    if (visited.has(id)) return true;
    const commit = remote.get(id);
    if (!commit || visiting.has(id)) return false;
    visiting.add(id);
    if (!commit.parents.every(validate)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  if (!Object.values(g.origin.branches).every(validate)) return "Origin has missing objects or cyclic history.";
  for (const id of visited) {
    const commit = remote.get(id)!;
    const local = find(g, id);
    if (local && (local.message !== commit.message
      || JSON.stringify(local.parents) !== JSON.stringify(commit.parents)
      || !equalTree(local.tree, commit.tree))) return `Origin object ${id} conflicts with a local object.`;
    if (!local) g.commits.push(copyCommit(commit));
  }
  g.tracking = {
    ...g.tracking,
    ...Object.fromEntries(Object.entries(g.origin.branches).map(
      ([branch, id]) => [`origin/${branch}`, id],
    )),
  };
  return undefined;
}

/**
 * Compare the reachable, ref-labeled DAG, preserving first-parent order.
 * IDs, messages, file contents (including stash snapshots), and unreachable
 * objects are intentionally irrelevant. Stash order/status remains relevant.
 */
export function matchesGoal(actual: Graph, goal: Graph): boolean {
  if (actual.initialized !== goal.initialized || actual.dirty !== goal.dirty
    || actual.staged !== goal.staged || actual.stash.length !== goal.stash.length
    || actual.stash.some((entry, i) => entry.dirty !== goal.stash[i].dirty
      || entry.staged !== goal.stash[i].staged)
    || actual.conflict?.kind !== goal.conflict?.kind
    || ("branch" in actual.head) !== ("branch" in goal.head)) return false;
  if ("branch" in actual.head && "branch" in goal.head && actual.head.branch !== goal.head.branch) return false;

  const nodes = (g: Graph) => new Map([...g.origin.commits, ...g.commits].map((commit) => [commit.id, commit]));
  const aNodes = nodes(actual);
  const bNodes = nodes(goal);
  const forward = new Map<string, string>();
  const backward = new Map<string, string>();
  const compare = (a: string, b: string): boolean => {
    if (forward.has(a)) return forward.get(a) === b;
    if (backward.has(b)) return false;
    const ac = aNodes.get(a);
    const bc = bNodes.get(b);
    if (!ac || !bc || ac.parents.length !== bc.parents.length) return false;
    forward.set(a, b);
    backward.set(b, a);
    return ac.parents.every((parent, i) => compare(parent, bc.parents[i]));
  };
  const refs = (a: Record<string, string>, b: Record<string, string>): boolean =>
    Object.keys(a).length === Object.keys(b).length
    && Object.keys(a).every((key) => own(b, key) && compare(a[key], b[key]));
  if (!refs(actual.branches, goal.branches) || !refs(actual.tags, goal.tags)
    || !refs(actual.tracking, goal.tracking) || !refs(actual.origin.branches, goal.origin.branches)) return false;
  if ("commit" in actual.head && "commit" in goal.head && !compare(actual.head.commit, goal.head.commit)) return false;
  if (actual.conflict && goal.conflict && !compare(actual.conflict.target, goal.conflict.target)) return false;
  return true;
}
