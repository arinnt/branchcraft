import { headId, type Graph, type Commit } from "./graph";

const NS = "http://www.w3.org/2000/svg";
const svg = <K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] =>
  document.createElementNS(NS, tag);

type Point = { x: number; y: number };

function layout(commits: Commit[]): Map<string, Point> {
  const points = new Map<string, Point>();
  const occupied = new Map<number, Set<number>>();
  const visiting = new Set<string>();
  const place = (commit: Commit): Point => {
    const existing = points.get(commit.id);
    if (existing) return existing;
    if (visiting.has(commit.id)) return { x: 65, y: 90 };
    visiting.add(commit.id);
    const parents = commit.parents.flatMap(id => {
      const parent = commits.find(item => item.id === id);
      return parent ? [place(parent)] : [];
    });
    const depth = parents.length ? Math.max(...parents.map(point => (point.x - 65) / 145)) + 1 : 0;
    let lane = parents[0] ? (parents[0].y - 90) / 85 : 0;
    const used = occupied.get(depth) ?? new Set<number>();
    while (used.has(lane)) lane++;
    used.add(lane);
    occupied.set(depth, used);
    const point = { x: 65 + depth * 145, y: 90 + lane * 85 };
    points.set(commit.id, point);
    visiting.delete(commit.id);
    return point;
  };
  commits.forEach(place);
  return points;
}

/** The graph is an SVG canvas so its interactive nodes remain keyboard accessible. */
export class GraphCanvas {
  private root = svg("svg");
  private actual = svg("g");
  private ghost = svg("g");
  private selected = "";
  private graph: Graph;
  private nodes = new Map<string, SVGGElement>();
  private labels = new Map<string, SVGGElement>();
  private observer: ResizeObserver;

  constructor(
    private host: HTMLElement,
    graph: Graph,
    private goal: Graph | undefined,
    private onSelect: (id: string) => void,
    private onCheckout: (ref: string) => void,
  ) {
    this.graph = graph;
    this.root.setAttribute("class", "graph-canvas");
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", "Interactive commit graph. Arrow keys select commits; Enter checks out a commit or branch.");
    this.actual.setAttribute("class", "actual-graph");
    this.ghost.setAttribute("class", "goal-graph");
    this.root.append(this.actual, this.ghost);
    this.host.append(this.root);
    this.observer = new ResizeObserver(() => this.size());
    this.observer.observe(this.host);
    this.update(graph, "");
  }

  private size(): void {
    const box = this.root.viewBox.baseVal;
    this.root.style.width = `${Math.max(this.host.clientWidth - 2, box.width)}px`;
  }

  update(graph: Graph, selected: string): void {
    this.graph = graph;
    this.selected = selected;
    const commits = [...graph.commits];
    graph.origin.commits.forEach(commit => {
      if (!commits.some(item => item.id === commit.id)) commits.push(commit);
    });
    const positions = layout(commits);
    const goalCommits = this.goal ? [...this.goal.commits, ...this.goal.origin.commits.filter(commit => !this.goal!.commits.some(item => item.id === commit.id))] : [];
    const goalPositions = layout(goalCommits);
    const points = [...positions.values(), ...goalPositions.values()];
    const width = Math.max(650, ...points.map(point => point.x + 130));
    const actualHeight = Math.max(260, ...[...positions.values()].map(point => point.y + 110));
    const goalHeight = this.goal ? Math.max(210, ...[...goalPositions.values()].map(point => point.y + 80)) : 0;
    this.root.setAttribute("viewBox", `0 0 ${width} ${actualHeight + goalHeight}`);
    this.root.style.height = `${actualHeight + goalHeight}px`;
    this.size();
    this.draw(this.actual, commits, graph, positions, 0, false);
    this.ghost.replaceChildren();
    if (this.goal) this.draw(this.ghost, goalCommits, this.goal, goalPositions, actualHeight, true);
  }

  private draw(
    layer: SVGGElement, commits: Commit[], graph: Graph,
    points: Map<string, Point>, offset: number, ghost: boolean,
  ): void {
    layer.querySelectorAll(".edge, .graph-title").forEach(node => node.remove());
    const title = svg("text");
    title.setAttribute("class", "graph-title");
    title.setAttribute("x", "24");
    title.setAttribute("y", String(offset + 25));
    title.textContent = ghost ? "GOAL · match these connections and refs" : "YOUR REPOSITORY · click a commit or branch";
    layer.append(title);
    const liveIds = new Set(commits.map(commit => commit.id));
    if (!ghost) this.nodes.forEach((node, id) => {
      if (!liveIds.has(id)) { node.remove(); this.nodes.delete(id); }
    });
    commits.forEach(commit => {
      const point = points.get(commit.id)!;
      commit.parents.forEach(parent => {
        const from = points.get(parent);
        if (!from) return;
        const edge = svg("path");
        edge.setAttribute("class", "edge");
        edge.setAttribute("d", `M ${from.x} ${from.y + offset} C ${from.x + 65} ${from.y + offset}, ${point.x - 65} ${point.y + offset}, ${point.x} ${point.y + offset}`);
        layer.insertBefore(edge, layer.firstChild);
      });
      let group = ghost ? undefined : this.nodes.get(commit.id);
      if (!group) {
        group = svg("g");
        const circle = svg("circle");
        circle.setAttribute("r", "17");
        const text = svg("text");
        text.setAttribute("y", "36");
        text.setAttribute("text-anchor", "middle");
        text.textContent = commit.id;
        const description = svg("title");
        description.textContent = `${commit.id}: ${commit.message}; parents ${commit.parents.join(", ") || "none"}`;
        group.append(circle, text, description);
        if (!ghost) {
          group.setAttribute("role", "button");
          group.setAttribute("tabindex", "0");
          group.addEventListener("click", () => this.onSelect(commit.id));
          group.addEventListener("keydown", event => this.key(event, commit.id));
          this.nodes.set(commit.id, group);
        }
        layer.append(group);
      }
      group.setAttribute("class", `commit-node${commit.id === this.selected && !ghost ? " selected" : ""}${commit.id === headId(graph) ? " head" : ""}`);
      group.setAttribute("aria-label", `Commit ${commit.id}: ${commit.message}${commit.id === headId(graph) ? ", HEAD" : ""}`);
      group.setAttribute("aria-pressed", String(!ghost && commit.id === this.selected));
      group.style.transform = `translate(${point.x}px, ${point.y + offset}px)`;
    });
    const refs = [
      ...Object.entries(graph.branches).map(([name, id]) => ({ name, id, checkout: name, remote: false })),
      ...Object.entries(graph.tracking).map(([name, id]) => ({ name, id, checkout: id, remote: true })),
      ...Object.entries(graph.origin.branches).filter(([name, id]) => graph.tracking[`origin/${name}`] !== id)
        .map(([name, id]) => ({ name: `origin server/${name}`, id, checkout: "", remote: true })),
      ...Object.entries(graph.tags).map(([name, id]) => ({ name: `tag: ${name}`, id, checkout: id, remote: false })),
    ];
    if ("commit" in graph.head) refs.unshift({ name: "HEAD (detached)", id: graph.head.commit, checkout: graph.head.commit, remote: false });
    const stacks = new Map<string, number>();
    const labelKeys = new Set<string>();
    refs.forEach(ref => {
      const point = points.get(ref.id);
      if (!point) return;
      const stack = stacks.get(ref.id) ?? 0;
      stacks.set(ref.id, stack + 1);
      const key = ref.name;
      labelKeys.add(key);
      let label = ghost ? undefined : this.labels.get(key);
      const fresh = !label;
      label ??= svg("g");
      label.replaceChildren();
      label.setAttribute("class", `ref-label${ref.remote ? " remote" : ""}`);
      label.style.transform = `translate(${point.x - 40}px, ${point.y + offset - 40 - stack * 23}px)`;
      const text = svg("text");
      const current = "branch" in graph.head && graph.head.branch === ref.checkout;
      text.textContent = `${current ? "HEAD → " : ""}${ref.name}`;
      const rect = svg("rect");
      rect.setAttribute("x", "-5");
      rect.setAttribute("y", "-14");
      rect.setAttribute("rx", "5");
      rect.setAttribute("height", "21");
      rect.setAttribute("width", String(text.textContent.length * 7 + 12));
      label.append(rect, text);
      if (!ghost && ref.checkout && fresh) {
        label.setAttribute("role", "button");
        label.setAttribute("tabindex", "0");
        label.setAttribute("aria-label", `Checkout ${ref.name}`);
        label.addEventListener("click", () => this.onCheckout(label!.dataset.checkout!));
        label.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); this.onCheckout(label!.dataset.checkout!);
          }
        });
      }
      label.dataset.checkout = ref.checkout;
      if (fresh) layer.append(label);
      if (!ghost) this.labels.set(key, label);
    });
    if (!ghost) this.labels.forEach((label, key) => {
      if (!labelKeys.has(key)) { label.remove(); this.labels.delete(key); }
    });
  }

  private key(event: KeyboardEvent, id: string): void {
    if (event.key === "Enter") { event.preventDefault(); this.onCheckout(id); return; }
    if (event.key === " ") { event.preventDefault(); this.onSelect(id); return; }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const ids = this.graph.commits.map(commit => commit.id);
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = ids[(ids.indexOf(id) + delta + ids.length) % ids.length];
    if (next) { this.onSelect(next); this.nodes.get(next)?.focus(); }
  }

  reject(): void {
    this.host.classList.remove("rejected");
    void this.host.offsetWidth;
    this.host.classList.add("rejected");
  }

  dispose(): void { this.observer.disconnect(); this.root.remove(); }
}
