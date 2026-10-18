import repository from "./repository.ts";
import clone from "./clone.ts";
import commit from "./commit.ts";
import branch from "./branch.ts";
import checkout from "./checkout.ts";
import merge from "./merge.ts";
import mergeConflict from "./merge-conflict.ts";
import push from "./push.ts";
import fetchPull from "./fetch-pull.ts";
import fork from "./fork.ts";
import pullRequest from "./pull-request.ts";
import rebase from "./rebase.ts";
import stash from "./stash.ts";
import revertReset from "./revert-reset.ts";
import tagRelease from "./tag-release.ts";
import gitignore from "./gitignore.ts";
import head from "./head.ts";
import type { LevelDefinition } from "./types.ts";

export const levels: LevelDefinition[] = [
  repository, clone, commit, branch, checkout, merge, mergeConflict, push,
  fetchPull, fork, pullRequest, rebase, stash, revertReset, tagRelease,
  gitignore, head,
];
