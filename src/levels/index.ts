import repository from "./repository";
import clone from "./clone";
import commit from "./commit";
import branch from "./branch";
import checkout from "./checkout";
import merge from "./merge";
import mergeConflict from "./merge-conflict";
import push from "./push";
import fetchPull from "./fetch-pull";
import fork from "./fork";
import pullRequest from "./pull-request";
import rebase from "./rebase";
import stash from "./stash";
import revertReset from "./revert-reset";
import tagRelease from "./tag-release";
import gitignore from "./gitignore";
import head from "./head";

export const levels = [
  repository, clone, commit, branch, checkout, merge, mergeConflict, push,
  fetchPull, fork, pullRequest, rebase, stash, revertReset, tagRelease,
  gitignore, head,
];
