"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github")); //
const _ = __importStar(require("lodash"));
const yaml = __importStar(require("js-yaml"));
const fs = __importStar(require("fs"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput('GITHUB_TOKEN', { required: true });
            const configPath = core.getInput('CONFIG_PATH', { required: true });
            const configObj = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
            if (!configObj) {
                console.log('There is no configuration to set the labels');
                return;
            }
            const prInfo = getPRInfo();
            if (!prInfo) {
                console.log("There's no info for this PR");
                return;
            }
            const client = new github.GitHub(token);
            const labels = yield getLabels(client, prInfo.repoName);
            if (!labels.length) {
                console.log('There are no labels in this project');
                return;
            }
            let githubAction;
            if (prInfo.state === 'commented' && configObj.onComment) {
                githubAction = configObj.onComment;
            }
            else if (prInfo.state === 'approved' && configObj.onApproved) {
                githubAction = configObj.onApproved;
            }
            else if (prInfo.state === 'changes_requested' && configObj.onChangesRequested) {
                githubAction = configObj.onChangesRequested;
            }
            const { selectedLabelsToAssign, selectedLabelsToRemove, } = getLabelsIdsToMutate(githubAction, labels);
            if (!(client && prInfo.nodeId && selectedLabelsToAssign.length)) {
                console.log('There was an error');
                return;
            }
            yield removeLabelsFromLabelable(client, prInfo.nodeId, selectedLabelsToRemove);
            yield addLabelsToLabelable(client, prInfo.nodeId, selectedLabelsToAssign);
        }
        catch (error) {
            core.error(error);
            core.setFailed(error.message);
        }
    });
}
function getPRInfo() {
    const pr = github.context.payload.pull_request;
    const review = github.context.payload.review;
    const repo = github.context.payload.repository;
    if (!(pr && review && repo && repo.full_name)) {
        return;
    }
    return {
        nodeId: pr.node_id,
        state: review.state,
        labels: pr.labels,
        repoName: repo.full_name,
    };
}
function getLabels(client, fullName) {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = fullName.split('/');
        const result = yield client.graphql(`query Labels($repo: String!, $owner: String!) {
      repository(name: $repo, owner: $owner) {
        labels(first: 90) {
          nodes {
            id
            name
          }
        }
      }
    }
  `, {
            repo,
            owner,
        });
        const labels = result.repository.labels.nodes;
        return labels;
    });
}
function getLabelsIdsToMutate(action, labels) {
    let selectedLabelsToAssign;
    let selectedLabelsToRemove;
    if (action.set) {
        selectedLabelsToAssign = _.chain(labels)
            .filter((label) => action.set.includes(label.name))
            .map('id')
            .value();
    }
    if (action.remove) {
        selectedLabelsToRemove = _.chain(labels)
            .filter((label) => action.remove.includes(label.name))
            .map('id')
            .value();
    }
    return {
        selectedLabelsToAssign,
        selectedLabelsToRemove,
    };
}
function addLabelsToLabelable(client, labelableNodeId, labelIds) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.graphql(`mutation AddLabels($input: AddLabelsToLabelableInput!) {
      addLabelsToLabelable(input: $input) {
        clientMutationId
      }
    }
  `, {
            input: {
                labelableId: labelableNodeId,
                labelIds,
            },
        });
    });
}
function removeLabelsFromLabelable(client, labelableNodeId, labelIds) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.graphql(`mutation RemoveLabels($input: RemoveLabelsFromLabelableInput!) {
      removeLabelsFromLabelable(input: $input) {
        clientMutationId
      }
    }
  `, {
            input: {
                labelableId: labelableNodeId,
                labelIds,
            },
        });
    });
}
run();
